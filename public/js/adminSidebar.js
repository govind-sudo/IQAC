document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("adminSidebar");
    const menuBtn = document.getElementById("menuToggleBtn");
    const overlay = document.getElementById("sidebarOverlay");

    if (!sidebar) return;

    function openSidebar() {
        sidebar.classList.add("open");
        if (overlay) overlay.classList.add("show");
        document.body.classList.add("sidebar-open");
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
        if (overlay) overlay.classList.remove("show");
        document.body.classList.remove("sidebar-open");
    }

    if (menuBtn) menuBtn.addEventListener("click", openSidebar);
    if (overlay) overlay.addEventListener("click", closeSidebar);

    // Escape Key Handler
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeSidebar();
    });

    // Reset layout safely if expanding window viewports
    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) closeSidebar();
    });
});