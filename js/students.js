// students.js - Professional Student Management System (Fixed)

// ===============================
// Data Management
// ===============================
let students = JSON.parse(localStorage.getItem("students")) || [];

function saveStudents() {
    localStorage.setItem("students", JSON.stringify(students));
    updateDashboard();
    // Only update reports if we're on reports page and functions exist
    if (typeof updateReports === 'function') {
        updateReports();
    }
}

// ===============================
// Page Detection Helper
// ===============================
function isOnPage(pageName) {
    return window.location.pathname.includes(pageName);
}

// ===============================
// Initialize Page
// ===============================
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize date picker if on attendance or students page
    if (isOnPage('attendance.html') || isOnPage('students.html')) {
        initializeDatePicker();
    }
    
    // Display students if on pages that have student list
    if (document.getElementById("studentList")) {
        displayStudents();
    }
    
    // Update dashboard if on pages that have dashboard elements
    if (document.getElementById("totalStudents") || 
        document.getElementById("presentCount") || 
        document.getElementById("absentCount")) {
        updateDashboard();
    }
    
    // Create chart if on pages that have chart canvas
    if (document.getElementById("attendanceChart")) {
        createChart();
    }
    
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
    // Only setup student form listeners if on students page
    const nameInput = document.getElementById("name");
    const rollInput = document.getElementById("roll");
    
    if (nameInput && rollInput) {
        nameInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                rollInput.focus();
            }
        });
        
        rollInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                addStudent();
            }
        });
    }
}

function getSelectedDate() {
    let dateInput = document.getElementById("attendanceDate");
    // Return today's date if element doesn't exist or has no value
    if (!dateInput || !dateInput.value) {
        let today = new Date();
        return today.getFullYear() + "-" +
               String(today.getMonth() + 1).padStart(2, "0") + "-" +
               String(today.getDate()).padStart(2, "0");
    }
    return dateInput.value;
}

// ===============================
// Student Management
// ===============================
function addStudent() {
    let nameInput = document.getElementById("name");
    let rollInput = document.getElementById("roll");
    
    if (!nameInput || !rollInput) {
        console.error("Student form elements not found");
        return;
    }
    
    let name = nameInput.value.trim();
    let roll = rollInput.value.trim();
    
    if (name === "" || roll === "") {
        showNotification("Please fill in all fields", "error");
        return;
    }
    
    // Check for duplicate roll number
    let exists = students.some(student => student.roll === roll);
    if (exists) {
        showNotification("Roll number already exists", "error");
        return;
    }
    
    // Add new student
    students.push({
        id: Date.now(),
        name: name,
        roll: roll,
        attendance: {},
        enrollmentDate: new Date().toISOString()
    });
    
    // Sort by roll number
    students.sort((a, b) => Number(a.roll) - Number(b.roll));
    
    saveStudents();
    
    // Only display if on students/attendance page
    if (document.getElementById("studentList")) {
        displayStudents();
    }
    
    // Clear inputs
    nameInput.value = "";
    rollInput.value = "";
    nameInput.focus();
    
    showNotification("Student added successfully", "success");
}

function editStudent(index) {
    if (!students[index]) return;
    
    let newName = prompt("Enter new name:", students[index].name);
    if (newName === null) return;
    
    let newRoll = prompt("Enter new roll number:", students[index].roll);
    if (newRoll === null) return;
    
    newName = newName.trim();
    newRoll = newRoll.trim();
    
    if (newName === "" || newRoll === "") {
        showNotification("Fields cannot be empty", "error");
        return;
    }
    
    // Check for duplicate roll number
    let exists = students.some((student, i) => student.roll === newRoll && i !== index);
    if (exists) {
        showNotification("Roll number already exists", "error");
        return;
    }
    
    students[index].name = newName;
    students[index].roll = newRoll;
    
    // Re-sort
    students.sort((a, b) => Number(a.roll) - Number(b.roll));
    
    saveStudents();
    
    if (document.getElementById("studentList")) {
        displayStudents();
    }
    
    showNotification("Student updated successfully", "success");
}

function deleteStudent(index) {
    if (!students[index]) return;
    
    if (confirm(`Are you sure you want to delete ${students[index].name}?`)) {
        students.splice(index, 1);
        saveStudents();
        if (document.getElementById("studentList")) {
            displayStudents();
        }
        showNotification("Student deleted successfully", "success");
    }
}

// ===============================
// Display Functions
// ===============================
function displayStudents() {
    let list = document.getElementById("studentList");
    if (!list) return;
    
    list.innerHTML = "";
    let date = getSelectedDate();
    
    if (students.length === 0) {
        list.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">No students found. Add your first student!</td></tr>';
        return;
    }
    
    students.forEach((student, index) => {
        let status = student.attendance && student.attendance[date] === "Present" ? "Present" : "Absent";
        let statusClass = status === "Present" ? "present-badge" : "absent-badge";
        let percent = calculateAttendancePercentage(student);
        
        list.innerHTML += `
            <tr>
                <td><strong>${escapeHtml(student.name)}</strong></td>
                <td>${escapeHtml(student.roll)}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percent}%; background: ${percent >= 75 ? '#2ecc71' : percent >= 50 ? '#f39c12' : '#e74c3c'}">
                            ${percent}%
                        </div>
                    </div>
                </td>
                <td><span class="${statusClass}">${status}</span></td>
                <td class="action-buttons">
                    <button class="btn-sm ${status === 'Present' ? 'btn-danger' : 'btn-success'}" 
                            onclick="toggleAttendance(${index})">
                        <i class="fa-solid fa-${status === 'Present' ? 'times' : 'check'}"></i>
                        ${status === 'Present' ? 'Absent' : 'Present'}
                    </button>
                    <button class="btn-sm btn-warning" onclick="editStudent(${index})">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="btn-sm btn-danger" onclick="deleteStudent(${index})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function toggleAttendance(index) {
    if (!students[index]) return;
    
    let date = getSelectedDate();
    
    if (!students[index].attendance) {
        students[index].attendance = {};
    }
    
    let newStatus = students[index].attendance[date] === "Present" ? "Absent" : "Present";
    students[index].attendance[date] = newStatus;
    
    saveStudents();
    
    if (document.getElementById("studentList")) {
        displayStudents();
    }
    
    showNotification(`${students[index].name} marked as ${newStatus}`, "info");
}

function markAllPresent() {
    let date = getSelectedDate();
    
    students.forEach(student => {
        if (!student.attendance) {
            student.attendance = {};
        }
        student.attendance[date] = "Present";
    });
    
    saveStudents();
    
    if (document.getElementById("studentList")) {
        displayStudents();
    }
    
    showNotification("All students marked as present", "success");
}

// ===============================
// Dashboard Functions
// ===============================
function updateDashboard() {
    let date = getSelectedDate();
    let total = students.length;
    let present = students.filter(student => 
        student.attendance && student.attendance[date] === "Present"
    ).length;
    let absent = total - present;
    
    // Update elements if they exist
    const totalElem = document.getElementById("totalStudents");
    const presentElem = document.getElementById("presentCount");
    const absentElem = document.getElementById("absentCount");
    const percentElem = document.getElementById("attendancePercent");
    
    if (totalElem) totalElem.innerText = total;
    if (presentElem) presentElem.innerText = present;
    if (absentElem) absentElem.innerText = absent;
    
    // Update attendance percentage
    let percent = total === 0 ? 0 : Math.round((present / total) * 100);
    if (percentElem) percentElem.innerText = percent + "%";
}

function calculateAttendancePercentage(student) {
    if (!student.attendance) return 0;
    
    let totalDays = Object.keys(student.attendance).length;
    if (totalDays === 0) return 0;
    
    let presentDays = Object.values(student.attendance).filter(status => status === "Present").length;
    return Math.round((presentDays / totalDays) * 100);
}

// ===============================
// Chart Functions
// ===============================
let chart;

function createChart() {
    let ctx = document.getElementById("attendanceChart");
    if (!ctx) return;
    
    let total = students.length;
    let date = getSelectedDate();
    let present = students.filter(student => 
        student.attendance && student.attendance[date] === "Present"
    ).length;
    let absent = total - present;
    
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Present", "Absent"],
            datasets: [{
                data: [present, absent],
                backgroundColor: ["#2ecc71", "#e74c3c"],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            let value = context.raw || 0;
                            let total = context.dataset.data.reduce((a, b) => a + b, 0);
                            let percentage = total === 0 ? 0 : Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function handleDateChange() {
    if (document.getElementById("studentList")) {
        displayStudents();
    }
    updateDashboard();
    createChart();
}

// ===============================
// Search Function
// ===============================
function searchStudent() {
    let searchTerm = document.getElementById("search");
    if (!searchTerm) return;
    
    let term = searchTerm.value.toLowerCase();
    let list = document.getElementById("studentList");
    if (!list) return;
    
    let rows = list.getElementsByTagName("tr");
    
    for (let row of rows) {
        if (row.cells && row.cells.length >= 2) {
            let name = row.cells[0]?.innerText.toLowerCase() || "";
            let roll = row.cells[1]?.innerText.toLowerCase() || "";
            
            if (name.includes(term) || roll.includes(term)) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        }
    }
}

// ===============================
// Export Functions
// ===============================
function exportCSV() {
    let date = getSelectedDate();
    let csv = "Name,Roll Number,Status,Attendance Percentage\n";
    
    students.forEach(student => {
        let status = student.attendance && student.attendance[date] ? student.attendance[date] : "Absent";
        let percent = calculateAttendancePercentage(student);
        csv += `"${student.name}",${student.roll},${status},${percent}%\n`;
    });
    
    let blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification("Export completed successfully", "success");
}

function exportPDF() {
    let date = getSelectedDate();
    
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
        showNotification("PDF library not loaded. Please refresh the page.", "error");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    let doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Student Attendance Report", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Date: ${date}`, 20, 30);
    doc.text(`Total Students: ${students.length}`, 20, 38);
    
    let presentCount = students.filter(s => s.attendance && s.attendance[date] === "Present").length;
    doc.text(`Present: ${presentCount}`, 20, 46);
    doc.text(`Absent: ${students.length - presentCount}`, 20, 54);
    
    let y = 70;
    doc.setFontSize(10);
    doc.text("Name", 20, y);
    doc.text("Roll", 80, y);
    doc.text("Status", 140, y);
    
    y += 8;
    
    students.forEach(student => {
        let status = student.attendance && student.attendance[date] ? student.attendance[date] : "Absent";
        doc.text(student.name, 20, y);
        doc.text(student.roll.toString(), 80, y);
        doc.text(status, 140, y);
        y += 7;
        
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
    });
    
    doc.save(`attendance_${date}.pdf`);
    showNotification("PDF generated successfully", "success");
}

function exportTodayReport() {
    exportCSV();
}

// ===============================
// Helper Functions
// ===============================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = "info") {
    // Remove existing notification
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerHTML = `
        <i class="fa-solid fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 0.9rem;
    `;
    
    setTimeout(() => {
        notification.style.animation = "slideOut 0.3s ease-out";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations if not already added
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .progress-bar {
            width: 100px;
            background: #eef2f6;
            border-radius: 20px;
            overflow: hidden;
            height: 24px;
            position: relative;
        }
        
        .progress-fill {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.7rem;
            font-weight: 600;
            transition: width 0.3s ease;
            border-radius: 20px;
        }
        
        .present-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            background: #e8f5e9;
            color: #2ecc71;
        }
        
        .absent-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            background: #ffebee;
            color: #e74c3c;
        }
        
        .btn-sm {
            padding: 6px 12px;
            font-size: 0.8rem;
        }
        
        .btn-success {
            background: #2ecc71;
        }
        
        .btn-success:hover {
            background: #27ae60;
        }
        
        .btn-danger {
            background: #e74c3c;
        }
        
        .btn-danger:hover {
            background: #c0392b;
        }
        
        .btn-warning {
            background: #f39c12;
        }
        
        .btn-warning:hover {
            background: #e67e22;
        }
        
        .action-buttons {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
    `;
    document.head.appendChild(style);
}

// ===============================
// Authentication Functions
// ===============================
function teacherLogin() {
    let userInput = document.getElementById("teacherUser");
    let passInput = document.getElementById("teacherPass");
    
    if (!userInput || !passInput) {
        console.error("Login form elements not found");
        return;
    }
    
    let user = userInput.value.trim();
    let pass = passInput.value;
    
    // Professional credentials
    const credentials = [
        { username: "admin", password: "1234", role: "teacher" },
        { username: "teacher", password: "teacher123", role: "teacher" }
    ];
    
    let valid = credentials.some(cred => cred.username === user && cred.password === pass);
    
    if (valid) {
        localStorage.setItem("role", "teacher");
        localStorage.setItem("teacherName", user);
        showNotification("Login successful! Redirecting...", "success");
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1000);
    } else {
        showNotification("Invalid username or password", "error");
    }
}

function studentLogin() {
    let rollInput = document.getElementById("studentRoll");
    if (!rollInput) return;
    
    let roll = rollInput.value.trim();
    let students = JSON.parse(localStorage.getItem("students")) || [];
    let found = students.find(student => student.roll == roll);
    
    if (found) {
        localStorage.setItem("loggedStudent", JSON.stringify(found));
        localStorage.setItem("studentRoll", roll);
        showNotification("Login successful!", "success");
        setTimeout(() => {
            window.location.href = "student-dashboard.html";
        }, 1000);
    } else {
        showNotification("Student not found", "error");
    }
}

function logout() {
    localStorage.removeItem("role");
    localStorage.removeItem("teacherName");
    localStorage.removeItem("loggedStudent");
    localStorage.removeItem("studentRoll");
    window.location.href = "index.html";
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { students, saveStudents, displayStudents, updateDashboard, createChart };
}