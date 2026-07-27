

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const archiverPkg = require('archiver');

const Student = require('../models/Student');
const {
  DOC_TYPE_TO_STUDENT_PATH,
  DOC_TYPE_LABELS,
  sanitizeForPath,
} = require('../services/storageService');

const DOC_TYPES = Object.keys(DOC_TYPE_TO_STUDENT_PATH);

const MAX_PENDING_ENTRIES = 16;


const ZIP64_ENTRY_THRESHOLD = 60000;

const COMPRESSION_LEVEL = 1;


function createZipArchive(options) {
  if (typeof archiverPkg === 'function') {
    return archiverPkg('zip', options); // archiver v5 – v7
  }
  if (archiverPkg && typeof archiverPkg.ZipArchive === 'function') {
    return new archiverPkg.ZipArchive(options); // archiver v8+
  }
  throw new Error(
    'Unsupported "archiver" version — expected a callable export or a ZipArchive class.'
  );
}

function getByPath(obj, dottedPath) {
  return dottedPath.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}


function buildStudentFilter(query) {
  const filter = {};

  const year = parseInt(query.year, 10);
  if (Number.isInteger(year)) filter.admissionYear = year;

  const branch = String(query.branch || '').trim();
  if (branch) filter.branch = branch;

  const institute = String(query.institute || '').trim();
  if (institute) filter.institute = institute;

  return filter;
}

/** Human-readable description of the active filter, for the UI + filename. */
function describeFilter(query) {
  const parts = [];
  if (query.year) parts.push(String(query.year));
  if (query.branch) parts.push(String(query.branch));
  if (query.institute) parts.push(String(query.institute));
  return parts;
}

/**
 * @desc    Landing page: every document type with a live count for the
 *          current filter, plus the filter controls themselves.
 * @route   GET /admin/documents
 * @access  Private (admin, subadmin)
 */
exports.getBulkDownloadsPage = async (req, res, next) => {
  try {
    const filter = buildStudentFilter(req.query);

    // One aggregation for all eleven counts, rather than eleven count
    // queries. Projects a 0/1 per document type, then sums.
    const projection = {};
    const grouping = { _id: null, total: { $sum: 1 } };

    DOC_TYPES.forEach((docType) => {
      const dotted = DOC_TYPE_TO_STUDENT_PATH[docType];
      projection[docType] = {
        $cond: [
          { $and: [{ $ne: [`$${dotted}`, null] }, { $ne: [`$${dotted}`, ''] }] },
          1,
          0,
        ],
      };
      grouping[docType] = { $sum: `$${docType}` };
    });

    const pipeline = [];
    if (Object.keys(filter).length) pipeline.push({ $match: filter });
    pipeline.push({ $project: projection }, { $group: grouping });

    // Filter dropdown options come from what's actually in the data, so
    // there are no hardcoded branch/institute lists to keep in sync.
    const [countsResult, years, branches, institutes] = await Promise.all([
      Student.aggregate(pipeline),
      Student.distinct('admissionYear'),
      Student.distinct('branch'),
      Student.distinct('institute'),
    ]);

    const counts = countsResult[0];

    const documentTypes = DOC_TYPES.map((docType) => ({
      key: docType,
      label: DOC_TYPE_LABELS[docType] || docType,
      count: counts ? counts[docType] || 0 : 0,
    }));

    // Preserve the active filter on every download link.
    const filterQuery = new URLSearchParams();
    ['year', 'branch', 'institute'].forEach((key) => {
      if (req.query[key]) filterQuery.set(key, req.query[key]);
    });

    return res.render('admin/bulkDownloads', {
      currentPage: 'documents',
      admin: req.admin,
      documentTypes,
      totalStudents: counts ? counts.total : 0,
      filterOptions: {
        years: years.filter(Boolean).sort((a, b) => b - a),
        branches: branches.filter(Boolean).sort(),
        institutes: institutes.filter(Boolean).sort(),
      },
      activeFilter: {
        year: req.query.year || '',
        branch: req.query.branch || '',
        institute: req.query.institute || '',
      },
      filterSuffix: filterQuery.toString() ? `&${filterQuery.toString()}` : '',
      filterLabel: describeFilter(req.query).join(' \u00b7 '),
      errorMessage: req.query.error || null,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * @desc    Stream a ZIP of every matching student's file of one type.
 * @route   GET /admin/documents/download?type=aadhaarProof&year=2025&branch=CSE
 * @access  Private (admin, subadmin)
 */
exports.downloadDocumentsByType = async (req, res, next) => {
  const docType = String(req.query.type || '').trim();

  // Whitelist check — docType is used to build a Mongo field path, so
  // an arbitrary string must never reach the query.
  if (!DOC_TYPE_TO_STUDENT_PATH[docType]) {
    return res.redirect('/admin/documents?error=Unknown+document+type.');
  }

  const dotted = DOC_TYPE_TO_STUDENT_PATH[docType];
  const label = DOC_TYPE_LABELS[docType] || docType;
  const filter = {
    ...buildStudentFilter(req.query),
    [dotted]: { $exists: true, $nin: [null, ''] },
  };

  try {
    const expectedCount = await Student.countDocuments(filter);

    if (!expectedCount) {
      return res.redirect(
        `/admin/documents?error=${encodeURIComponent(
          `No ${label} documents match the current selection.`
        )}`
      );
    }

    // ---------- Response headers (before the first byte) ----------
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = describeFilter(req.query).map(sanitizeForPath).filter(Boolean).join('_');
    const filename =
      [docType, suffix, `${expectedCount}files`, stamp].filter(Boolean).join('_') + '.zip';

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    const archive = createZipArchive({
      zlib: { level: COMPRESSION_LEVEL },
      forceZip64: expectedCount >= ZIP64_ENTRY_THRESHOLD,
    });

    const missing = [];

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        missing.push(err.message);
      } else {
        console.error(`Bulk download (${docType}) warning:`, err);
      }
    });

    archive.on('error', (err) => {
      console.error(`Bulk download (${docType}) failed mid-stream:`, err);

      res.destroy(err);
    });

    // If the admin cancels the download or the connection drops, stop
    // reading files immediately instead of grinding through 50k of them.
    let aborted = false;
    res.on('close', () => {
      if (!res.writableFinished) {
        aborted = true;
        archive.abort();
      }
    });

    archive.pipe(res);

    // ---------- Throttled feed ----------
    let pending = 0;
    let releaseDrain = null;

    archive.on('entry', () => {
      pending -= 1;
      if (releaseDrain && pending < MAX_PENDING_ENTRIES) {
        const release = releaseDrain;
        releaseDrain = null;
        release();
      }
    });

    async function appendThrottled(absolutePath, entryName) {
      archive.append(fs.createReadStream(absolutePath), { name: entryName });
      pending += 1;
      if (pending >= MAX_PENDING_ENTRIES) {
        await new Promise((resolve) => {
          releaseDrain = resolve;
        });
      }
    }

    // Cursor, not .find().lean() — a 50k-document result set should
    // never be materialised as a single array in memory.
    const cursor = Student.find(filter)
      .select(`firstName lastName ugNumber enrollmentNo ${dotted}`)
      .lean()
      .cursor();

    let appended = 0;

    for await (const student of cursor) {
      if (aborted) break;

      const relativePath = getByPath(student, dotted);
      if (!relativePath || !String(relativePath).startsWith('uploads/')) continue;

      const absolutePath = path.join(__dirname, '..', relativePath);

      try {
        await fsp.access(absolutePath);
      } catch (_) {
        missing.push(
          `${student.enrollmentNo || student.ugNumber || student._id} -> ${relativePath}`
        );
        continue;
      }

      // The stored filename already follows
      // {identifier}_{Name}_{docType}.{ext}, so reuse it verbatim.
      // Rebuild only for files predating that convention.
      let entryName = path.basename(relativePath);
      if (!entryName.includes(`_${docType}`)) {
        const identifier = sanitizeForPath(student.enrollmentNo || student.ugNumber || 'unknown');
        const nameToken = sanitizeForPath(`${student.firstName || ''}${student.lastName || ''}`);
        entryName = `${identifier}_${nameToken}_${docType}${path.extname(entryName)}`;
      }

      await appendThrottled(absolutePath, entryName);
      appended += 1;
    }

    await cursor.close().catch(() => {});

    if (aborted) return;

    if (!appended) {
      // Nothing could be read at all. Headers are already out, so the
      // most honest thing is a note inside the archive explaining why
      // it's empty.
      archive.append(
        `No ${label} files could be read from storage.\n` +
          `${missing.length} path(s) referenced in the database are missing on disk.\n`,
        { name: 'README.txt' }
      );
    }

    if (missing.length) {
      console.warn(
        `Bulk download (${docType}): ${missing.length} referenced file(s) missing on disk:\n  ` +
          missing.slice(0, 50).join('\n  ') +
          (missing.length > 50 ? `\n  ...and ${missing.length - 50} more` : '')
      );

      // Ship the manifest with the archive so the admin can see exactly
      // which students need re-uploads, instead of silently receiving
      // fewer files than the page promised.
      archive.append(
        `The following ${missing.length} file(s) are referenced in the database ` +
          `but were not found in storage:\n\n${missing.join('\n')}\n`,
        { name: '_MISSING_FILES.txt' }
      );
    }

    await archive.finalize();
  } catch (err) {
    if (res.headersSent) {
      console.error(`Bulk download (${docType}) failed after headers were sent:`, err);
      return res.destroy(err);
    }
    return next(err);
  }
};