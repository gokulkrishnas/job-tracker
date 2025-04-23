// Save current data to localStorage
function saveToLocalStorage() {
  const data = table.getData();
  localStorage.setItem("jobTrackerData", JSON.stringify(data));
}

// Load data from localStorage
function loadFromLocalStorage() {
  const saved = localStorage.getItem("jobTrackerData");
  return saved ? JSON.parse(saved) : [];
}

// Tabulator Table Initialization
const table = new Tabulator("#jobTable", {
  data: loadFromLocalStorage(),  // 👈 load existing data
  layout: "fitColumns",
  height: "auto",
  reactiveData: true,
  placeholder: "No job data yet. Paste a link above and click + Add Job.",
  columns: [
    {
      title: "Job Link",
      field: "link",
      formatter: "link",
      formatterParams: {
        labelField: "link",
        target: "_blank"
      },
      headerSort: false
    },
    {
      title: "Source",
      field: "source",
      hozAlign: "center",
      formatter: function (cell) {
        const source = cell.getValue();
        let color = "#999";
        if (source === "LinkedIn") color = "#0a66c2";
        else if (source === "Indeed") color = "#ff6600";
        else if (source === "Glassdoor") color = "#0caa41";
        else color = "#a47148"; // career page or unknown

        return `<span style="
          background-color: ${color};
          color: #fff;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
        ">${source}</span>`;
      }
    },
    { title: "Title", field: "title", editor: "input" },
    { title: "Company", field: "company", editor: "input" },
    { title: "Location", field: "location", editor: "input" },
    {
      title: "Status",
      field: "status",
      editor: "list",
      editorParams: {
        values: ["Applied", "Interviewed", "Offer", "Rejected"]
      },
      formatter: function (cell) {
        const val = cell.getValue();
        let color = "#aaa";
        if (val === "Applied") color = "#757575";
        else if (val === "Interviewed") color = "#1976d2";
        else if (val === "Offer") color = "#388e3c";
        else if (val === "Rejected") color = "#d32f2f";

        return `<span style="
          background-color: ${color};
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.8rem;
        ">${val}</span>`;
      }
    },
    {
      title: "Notes",
      field: "notes",
      editor: "textarea"
    },
    {
      title: "Delete",
      formatter: "buttonCross",
      width: 90,
      hozAlign: "center",
      cellClick: function (e, cell) {
        cell.getRow().delete();
        saveToLocalStorage(); // 👈 this line ensures the deletion is persisted
      }
    }
  ],
});

table.on("cellEdited", function () {
  saveToLocalStorage();
});

// Add Row Handler
document.getElementById("addJobBtn").addEventListener("click", async () => {
  const link = document.getElementById("jobLinkInput").value.trim();
  if (!link) return alert("Please paste a job link.");

  // Show spinner
  document.getElementById("spinnerOverlay").style.display = "flex";

  let title = "Title (edit)";
  let company = "Company (edit)";
  let location = "Location (edit)";
  let salary = "Unavailable";

  // Detect source
  let source = "Career Page";
  if (link.includes("linkedin.com")) source = "LinkedIn";
  else if (link.includes("indeed.com")) source = "Indeed";
  else if (link.includes("glassdoor.com")) source = "Glassdoor";

  try {
    const res = await fetch("http://127.0.0.1:5000/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: link })
    });


    const data = await res.json();

    if (data.error) throw new Error(data.error);

    title = data.title;
    company = data.company;
    location = data.location;
    salary = data.salary;

  } catch (err) {
    console.warn("Auto-fetch failed.", err.message);

    // Continue with placeholder values
    title = "Title (edit)";
    company = "Company (edit)";
    location = "Location (edit)";
    salary = "Unavailable";

  } finally {
    // Hide spinner
    document.getElementById("spinnerOverlay").style.display = "none";
  }

  table.addRow({
    link,
    source,
    title,
    company,
    location,
    salary,
    status: "Applied",
    notes: ""
  });

  saveToLocalStorage();

  document.getElementById("jobLinkInput").value = "";
});

// Filter Handlers
document.getElementById("statusFilter").addEventListener("change", () => {
  const val = document.getElementById("statusFilter").value;
  table.setFilter("status", val ? "=" : undefined, val);
});

document.getElementById("locationFilter").addEventListener("input", () => {
  const val = document.getElementById("locationFilter").value.trim().toLowerCase();
  table.setFilter("location", "like", val);
});

document.getElementById("titleFilter").addEventListener("input", () => {
  const val = document.getElementById("titleFilter").value.trim().toLowerCase();
  table.setFilter("title", "like", val);
});

document.getElementById("clearFilters").addEventListener("click", () => {
  document.getElementById("statusFilter").value = "";
  document.getElementById("locationFilter").value = "";
  document.getElementById("titleFilter").value = "";
  table.clearFilter();
});

// Export Buttons
const exportSection = document.createElement("div");
exportSection.style.marginTop = "1rem";
exportSection.innerHTML = `
  <button id="exportCSV">Export CSV</button>
  <button id="exportXLSX">Export Excel</button>
  <button id="clearAllJobs">🗑 Clear All Jobs</button>
`;
document.querySelector(".container").appendChild(exportSection);

document.getElementById("exportCSV").addEventListener("click", () => {
  table.download("csv", "job_applications.csv");
});
document.getElementById("exportXLSX").addEventListener("click", () => {
  table.download("xlsx", "job_applications.xlsx", { sheetName: "Jobs" });
});

// Theme Toggle
const toggleBtn = document.getElementById("toggleTheme");
toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const mode = document.body.classList.contains("dark-mode") ? "dark" : "light";
  localStorage.setItem("theme", mode);
});

// Load saved theme
window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  }
});

document.getElementById("clearAllJobs").addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all job entries?")) {
    table.clearData();
    localStorage.removeItem("jobTrackerData");
  }
});
