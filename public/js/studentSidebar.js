document.addEventListener("DOMContentLoaded", () => {

    const sidebar = document.querySelector(".sidebar");
    const menuBtn = document.getElementById("menuBtn");
    const overlay = document.getElementById("sidebarOverlay");
    const navLinks = document.querySelectorAll(".sidebar-nav a");

    // If sidebar isn't present, don't run
    if (!sidebar) return;

    // -------------------------
    // Open Sidebar
    // -------------------------
    function openSidebar() {

        sidebar.classList.add("open");

        if (overlay) {
            overlay.classList.add("show");
        }

        document.body.classList.add("sidebar-open");

    }

    // -------------------------
    // Close Sidebar
    // -------------------------
    function closeSidebar() {

        sidebar.classList.remove("open");

        if (overlay) {
            overlay.classList.remove("show");
        }

        document.body.classList.remove("sidebar-open");

    }

    // -------------------------
    // Toggle Sidebar
    // -------------------------
    function toggleSidebar() {

        if (sidebar.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }

    }

    // -------------------------
    // Hamburger Button
    // -------------------------
    if (menuBtn) {

        menuBtn.addEventListener("click", toggleSidebar);

    }

    // -------------------------
    // Overlay Click
    // -------------------------
    if (overlay) {

        overlay.addEventListener("click", closeSidebar);

    }

    // -------------------------
    // Close on Nav Click (Mobile)
    // -------------------------
    navLinks.forEach(link => {

        link.addEventListener("click", () => {

            if (window.innerWidth <= 768) {
                closeSidebar();
            }

        });

    });

    // -------------------------
    // ESC Key
    // -------------------------
    document.addEventListener("keydown", (e) => {

        if (e.key === "Escape") {
            closeSidebar();
        }

    });

    // -------------------------
    // Window Resize
    // -------------------------
    window.addEventListener("resize", () => {

        if (window.innerWidth > 768) {
            closeSidebar();
        }

    });

});