// students.js - Complete Working Version with Supabase

let students = [];
let searchTimeout;  

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async function() {
    if (typeof window.loadStudentsFromCloud === 'function') {
        await window.loadStudentsFromCloud();
        students = window.students || [];
    }
    // Fallback to localStorage
    if (students.length === 0) {
        const backup = localStorage.getItem('students_backup');
        if (backup) {
            students = JSON.parse(backup);
            window.students = students;
        }
    }
    initializeDatePicker();
    if (document.getElementById("studentList")) displayStudents();
    updateDashboard();
    if (document.getElementById("attendanceChart")) createChart();
    setupEventListeners();
});

function initializeDatePicker() {
    let dateInput = document.getElementById("attendanceDate");
    if (dateInput) {
        let today = new Date().toISOString().split("T")[0];
        dateInput.value = today;
    }
}

function setupEventListeners() {
    const nameInput = document.getElementById("name");
    const rollInput = document.getElementById("roll");
    if (nameInput && rollInput) {
        nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); rollInput.focus(); } });
        rollInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addStudent(); } });
    }
}

function getSelectedDate() {
    let dateInput = document.getElementById("attendanceDate");
    if (!dateInput || !dateInput.value) {
        let today = new Date();
        return today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    }
    return dateInput.value;
}

// ========== CRUD ==========
async function addStudent() {
    let nameInput = document.getElementById("name");
    let rollInput = document.getElementById("roll");
    if (!nameInput || !rollInput) return;
    let name = nameInput.value.trim();
    let roll = rollInput.value.trim();
    if (name === "" || roll === "") { showNotification("Please fill all fields", "error"); return; }
    let exists = students.some(s => s.roll === roll);
    if (exists) { showNotification("Roll number already exists", "error"); return; }
    students.push({ id: Date.now(), name, roll, attendance: {}, enrollmentDate: new Date().toISOString() });
    students.sort((a, b) => Number(a.roll) - Number(b.roll));
    window.students = students;
    if (typeof window.saveStudentsToCloud === 'function') await window.saveStudentsToCloud();
    saveLocalBackup();
    await refreshUI();
    showNotification("Student added & synced", "success");
}

async function editStudent(index) {
    if (!students[index]) return;
    let newName = prompt("Enter new name:", students[index].name);
    if (!newName) return;
    let newRoll = prompt("Enter new roll number:", students[index].roll);
    if (!newRoll) return;
    newName = newName.trim(); newRoll = newRoll.trim();
    if (newName === "" || newRoll === "") { showNotification("Fields cannot be empty", "error"); return; }
    let exists = students.some((s, i) => s.roll === newRoll && i !== index);
    if (exists) { showNotification("Roll number already exists", "error"); return; }
    students[index].name = newName;
    students[index].roll = newRoll;
    students.sort((a, b) => Number(a.roll) - Number(b.roll));
    window.students = students;
    saveToCloudAndLocal();
    await refreshUI();
    showNotification("Student updated", "success");
}

async function deleteStudent(index) {
    if (!students[index]) return;
    if (confirm(`Delete ${students[index].name}?`)) {
        students.splice(index, 1);
        window.students = students;
        await saveToCloudAndLocal();
        await refreshUI();
        showNotification("Student deleted", "success");
    }
}

async function toggleAttendance(index) {
    if (!students[index]) return;
    let date = getSelectedDate();
    if (!students[index].attendance) students[index].attendance = {};
    let newStatus = students[index].attendance[date] === "Present" ? "Absent" : "Present";
    students[index].attendance[date] = newStatus;
    window.students = students;
    await saveToCloudAndLocal();
    await refreshUI();  
    showNotification(`${students[index].name} marked ${newStatus}`, "info");
}

async function markAllPresent() {
    let date = getSelectedDate();
    students.forEach(s => { if (!s.attendance) s.attendance = {}; s.attendance[date] = "Present"; });
    window.students = students;
    await saveToCloudAndLocal();
    await refreshUI();
    showNotification("All marked present", "success");
}

// ========== SAVE FUNCTIONS ==========
function saveLocalBackup() { localStorage.setItem('students_backup', JSON.stringify(students)); }
async function saveToCloudAndLocal() {
    saveLocalBackup();
    if (typeof window.saveStudentsToCloud === 'function') await window.saveStudentsToCloud();
}

// ========== DISPLAY ==========
function displayStudents() {
    let list = document.getElementById("studentList");
    if (!list) return;
    list.innerHTML = "";
    let date = getSelectedDate();
    if (students.length === 0) { list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">No students found. Add your first student!</td></tr>'; return; }
    students.forEach((student, index) => {
        let status = student.attendance && student.attendance[date] === "Present" ? "Present" : "Absent";
        let statusClass = status === "Present" ? "present-badge" : "absent-badge";
        let percent = calculateAttendancePercentage(student);
        list.innerHTML += `<tr>
            <td><strong>${escapeHtml(student.name)}</strong></td>
            <td>${escapeHtml(student.roll)}</td>
            <td><div class="progress-bar"><div class="progress-fill" style="width:${percent}%; background:${percent>=75?'#2ecc71':percent>=50?'#f39c12':'#e74c3c'}">${percent}%</div></div></td>
            <td><span class="${statusClass}">${status}</span></td>
            <td class="action-buttons">
                <button class="btn-sm ${status==='Present'?'btn-danger':'btn-success'}" onclick="toggleAttendance(${index})"><i class="fa-solid fa-${status==='Present'?'times':'check'}"></i> ${status==='Present'?'Absent':'Present'}</button>
                <button class="btn-sm btn-warning" onclick="editStudent(${index})"><i class="fa-solid fa-edit"></i></button>
                <button class="btn-sm btn-danger" onclick="deleteStudent(${index})"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    });
}

function updateDashboard() {
    let date = getSelectedDate();
    let total = students.length;
    let present = students.filter(s => s.attendance && s.attendance[date] === "Present").length;
    let absent = total - present;
    if (document.getElementById("totalStudents")) document.getElementById("totalStudents").innerText = total;
    if (document.getElementById("presentCount")) document.getElementById("presentCount").innerText = present;
    if (document.getElementById("absentCount")) document.getElementById("absentCount").innerText = absent;
    let percent = total === 0 ? 0 : Math.round((present / total) * 100);
    if (document.getElementById("attendancePercent")) document.getElementById("attendancePercent").innerText = percent + "%";
}

function calculateAttendancePercentage(student) {
    if (!student.attendance) return 0;
    let totalDays = Object.keys(student.attendance).length;
    if (totalDays === 0) return 0;
    let presentDays = Object.values(student.attendance).filter(s => s === "Present").length;
    return Math.round((presentDays / totalDays) * 100);
}

// ========== CHART ==========
let chart;
function createChart() {
    let ctx = document.getElementById("attendanceChart");
    if (!ctx) return;
    let date = getSelectedDate();
    let present = students.filter(s => s.attendance && s.attendance[date] === "Present").length;
    let absent = students.length - present;
    if (chart) chart.destroy();
    chart = new Chart(ctx, { type: "doughnut", data: { labels: ["Present", "Absent"], datasets: [{ data: [present, absent], backgroundColor: ["#2ecc71", "#e74c3c"], borderWidth: 0 }] }, options: { responsive: true, plugins: { legend: { position: 'bottom' } } } });
}
///////////////fast refresh///////
async function refreshUI() {
    if (document.getElementById("studentList")) displayStudents();
    updateDashboard();
    if (document.getElementById("attendanceChart")) createChart();
}

function handleDateChange() {
    if (document.getElementById("studentList")) displayStudents();
    updateDashboard();
    createChart();
}



function searchStudent() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        let searchInput = document.getElementById("search");
        if (!searchInput) return;
        let term = searchInput.value.toLowerCase();
        let list = document.getElementById("studentList");
        if (!list) return;
        let rows = list.getElementsByTagName("tr");
        for (let row of rows) {
            if (row.cells && row.cells.length >= 2) {
                let name = row.cells[0]?.innerText.toLowerCase() || "";
                let roll = row.cells[1]?.innerText.toLowerCase() || "";
                row.style.display = name.includes(term) || roll.includes(term) ? "" : "none";
            }
        }
    }, 300);
}



// ========== EXPORT ==========
function exportCSV() {
    let date = getSelectedDate();
    let csv = "Name,Roll Number,Status,Attendance Percentage\n";
    students.forEach(s => {
        let status = s.attendance && s.attendance[date] ? s.attendance[date] : "Absent";
        let percent = calculateAttendancePercentage(s);
        csv += `"${s.name}",${s.roll},${status},${percent}%\n`;
    });
    let blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url; a.download = `attendance_${date}.csv`; a.click();
    URL.revokeObjectURL(url);
    showNotification("Export completed", "success");
}

function exportPDF() {
    if (typeof window.jspdf === 'undefined') { showNotification("PDF library not loaded", "error"); return; }
    let date = getSelectedDate();
    const { jsPDF } = window.jspdf;
    let doc = new jsPDF();
    doc.setFontSize(18); doc.text("Student Attendance Report", 20, 20);
    doc.setFontSize(12); doc.text(`Date: ${date}`, 20, 30);
    doc.text(`Total Students: ${students.length}`, 20, 38);
    let presentCount = students.filter(s => s.attendance && s.attendance[date] === "Present").length;
    doc.text(`Present: ${presentCount}`, 20, 46);
    doc.text(`Absent: ${students.length - presentCount}`, 20, 54);
    let y = 70;
    doc.text("Name", 20, y); doc.text("Roll", 80, y); doc.text("Status", 140, y);
    y += 8;
    students.forEach(s => {
        let status = s.attendance && s.attendance[date] ? s.attendance[date] : "Absent";
        doc.text(s.name, 20, y); doc.text(s.roll.toString(), 80, y); doc.text(status, 140, y);
        y += 7;
        if (y > 280) { doc.addPage(); y = 20; }
    });
    doc.save(`attendance_${date}.pdf`);
    showNotification("PDF generated", "success");
}

function exportTodayReport() { exportCSV(); }

// ========== HELPERS ==========
function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function showNotification(message, type = "info") {
    const existing = document.querySelector('.notification-toast'); if (existing) existing.remove();
    const notification = document.createElement('div');
    notification.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i><span>${message}</span>`;
    notification.style.cssText = `position:fixed; bottom:20px; right:20px; padding:12px 20px; background:${type==='success'?'#2ecc71':type==='error'?'#e74c3c':'#3498db'}; color:white; border-radius:8px; display:flex; align-items:center; gap:10px; z-index:1000; animation:slideIn 0.3s ease-out; box-shadow:0 4px 12px rgba(0,0,0,0.15);`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.animation = "slideOut 0.3s ease-out"; setTimeout(() => notification.remove(), 300); }, 3000);
}

// ========== LOGIN / LOGOUT ==========
window.teacherLogin = function() {
    let user = document.getElementById("teacherUser")?.value.trim();
    let pass = document.getElementById("teacherPass")?.value;
    if ((user === "admin" && pass === "1234") || (user === "teacher" && pass === "teacher123")) {
        localStorage.setItem("role", "teacher");
        localStorage.setItem("teacherName", user);
        alert("Login successful! Redirecting...");
        window.location.href = "dashboard.html";
    } else { alert("Invalid credentials! Use admin/1234 or teacher/teacher123"); }
};

window.studentLogin = async function() {
    let roll = document.getElementById("studentRoll")?.value.trim();
    if (!roll) { alert("Please enter roll number"); return; }
    if (window.students.length === 0) await window.loadStudentsFromCloud();
    let student = window.students.find(s => s.roll == roll);
    if (student) {
        localStorage.setItem("studentRoll", roll);
        localStorage.setItem("studentName", student.name);
        alert("Welcome " + student.name);
        window.location.href = "student-dashboard.html";
    } else { alert("Student not found with roll number: " + roll); }
};

window.logout = function() { localStorage.clear(); window.location.href = "index.html"; };

// ========== STYLES ==========
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `@keyframes slideIn{from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;}}@keyframes slideOut{from{transform:translateX(0);opacity:1;}to{transform:translateX(100%);opacity:0;}}.progress-bar{width:100px;background:#eef2f6;border-radius:20px;overflow:hidden;height:24px;}.progress-fill{height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:0.7rem;transition:width 0.3s;border-radius:20px;}.present-badge{display:inline-block;padding:4px 12px;border-radius:20px;background:#e8f5e9;color:#2ecc71;}.absent-badge{display:inline-block;padding:4px 12px;border-radius:20px;background:#ffebee;color:#e74c3c;}.btn-sm{padding:6px 12px;font-size:0.8rem;margin:2px;cursor:pointer;border:none;border-radius:6px;}.btn-success{background:#2ecc71;color:white;}.btn-danger{background:#e74c3c;color:white;}.btn-warning{background:#f39c12;color:white;}.action-buttons{display:flex;gap:5px;flex-wrap:wrap;}`;
    document.head.appendChild(style);
}