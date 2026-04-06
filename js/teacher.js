// teacher.js - Fixed for hardcoded login (no syntax errors)
let currentTeacher = null;
let currentClassId = null;
let currentSubjectId = null;
let studentsList = [];

// Bypass for hardcoded teacher login
if (localStorage.getItem('role') === 'teacher') {
    window.getCurrentUser = async () => {
        return {
            id: 'teacher-hardcoded',
            email: 'teacher@school.com',
            role: 'teacher',
            name: localStorage.getItem('userName') || 'Teacher'
        };
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    currentTeacher = await window.getCurrentUser();
    if (!currentTeacher || currentTeacher.role !== 'teacher') {
        alert('Access denied. Please login as teacher.');
        window.location.href = 'login.html';
        return;
    }
    loadTeacherClasses();
});

async function loadTeacherClasses() {
    const { data: existing } = await window.supabase.from('classes').select('*');
    if (existing && existing.length === 0) {
        await window.supabase.from('classes').insert([{ name: '10th', section: 'A' }]);
    }
    
    const { data } = await window.supabase.from('classes').select('*').order('name');
    const classSelect = document.getElementById('classSelect');
    if (!classSelect) return;
    classSelect.innerHTML = '<option value="">Select Class</option>';
    data.forEach(c => {
        classSelect.innerHTML += `<option value="${c.id}">${c.name} ${c.section || ''}</option>`;
    });
}

async function loadSubjectsForClass() {
    const classId = document.getElementById('classSelect').value;
    if (!classId) return;
    currentClassId = classId;
    
    const { data } = await window.supabase.from('subjects').select('*').order('name');
    const subjectSelect = document.getElementById('subjectSelect');
    if (!subjectSelect) return;
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    data.forEach(s => {
        subjectSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
}

async function loadStudentsForAttendance() {
    const subjectId = document.getElementById('subjectSelect').value;
    if (!subjectId) return;
    currentSubjectId = subjectId;
    
    const { data: students } = await window.supabase
        .from('students')
        .select('*')
        .eq('class_id', currentClassId);
    
    if (!students || students.length === 0) {
        document.getElementById('attendanceCard').style.display = 'block';
        document.getElementById('attendanceTable').innerHTML = '<p>No students found in this class. Please add students from Admin panel.</p>';
        return;
    }
    
    studentsList = students;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attDate').innerText = today;
    document.getElementById('attendanceCard').style.display = 'block';
    
    const { data: existing } = await window.supabase
        .from('attendance')
        .select('student_id, status')
        .eq('subject_id', currentSubjectId)
        .eq('date', today);
    
    const attMap = {};
    if (existing) existing.forEach(e => attMap[e.student_id] = e.status);
    
    let html = '<table class="attendance-table"><thead><tr><th>Roll</th><th>Student</th><th>Status</th></tr></thead><tbody>';
    students.forEach(s => {
        let status = attMap[s.id] || 'Present';
        html += '<tr>' +
            '<td>' + s.roll + '</td>' +
            '<td>' + s.name + '</td>' +
            '<td><select data-student="' + s.id + '" class="att-status">' +
            '<option ' + (status === 'Present' ? 'selected' : '') + '>Present</option>' +
            '<option ' + (status === 'Absent' ? 'selected' : '') + '>Absent</option>' +
            '<option ' + (status === 'Late' ? 'selected' : '') + '>Late</option>' +
            '</select></td>' +
            '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('attendanceTable').innerHTML = html;
}

async function saveAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const selects = document.querySelectorAll('.att-status');
    
    for (const sel of selects) {
        const studentId = parseInt(sel.dataset.student);
        const status = sel.value;
        
        await window.supabase.from('attendance').delete()
            .eq('student_id', studentId)
            .eq('subject_id', currentSubjectId)
            .eq('date', today);
        
        await window.supabase.from('attendance').insert([{
            student_id: studentId,
            class_id: currentClassId,
            subject_id: currentSubjectId,
            date: today,
            status: status,
            marked_by: currentTeacher.id
        }]);
    }
    alert('Attendance saved!');
}

async function showReport() {
    const { data } = await window.supabase
        .from('attendance')
        .select('*, students(name, roll)')
        .eq('class_id', currentClassId)
        .eq('subject_id', currentSubjectId);
    
    if (!data || data.length === 0) {
        document.getElementById('reportContainer').innerHTML = '<p>No attendance records found.</p>';
        return;
    }
    
    const studentMap = {};
    data.forEach(a => {
        if (!studentMap[a.student_id]) {
            studentMap[a.student_id] = {
                name: a.students?.name || 'Unknown',
                roll: a.students?.roll || '-',
                present: 0, absent: 0, late: 0
            };
        }
        if (a.status === 'Present') studentMap[a.student_id].present++;
        else if (a.status === 'Absent') studentMap[a.student_id].absent++;
        else studentMap[a.student_id].late++;
    });
    
    let html = '<h4>Attendance Report</h4><table class="report-table"><thead><tr><th>Roll</th><th>Name</th><th>Present</th><th>Absent</th><th>Late</th><th>%</th></tr></thead><tbody>';
    for (const id in studentMap) {
        const s = studentMap[id];
        const total = s.present + s.absent + s.late;
        const percent = total === 0 ? 0 : Math.round((s.present / total) * 100);
        html += '<tr>' +
            '<td>' + s.roll + '</td>' +
            '<td>' + s.name + '</td>' +
            '<td>' + s.present + '</td>' +
            '<td>' + s.absent + '</td>' +
            '<td>' + s.late + '</td>' +
            '<td>' + percent + '%</td>' +
            '</tr>';
    }
    html += '</tbody></table>';
    document.getElementById('reportContainer').innerHTML = html;
}

async function showAnalytics() {
    const { data } = await window.supabase
        .from('attendance')
        .select('date, status')
        .eq('class_id', currentClassId)
        .eq('subject_id', currentSubjectId);
    
    if (!data || data.length === 0) {
        alert('No data for analytics');
        return;
    }
    
    const dateMap = {};
    data.forEach(a => {
        if (!dateMap[a.date]) dateMap[a.date] = { total: 0, present: 0 };
        dateMap[a.date].total++;
        if (a.status === 'Present') dateMap[a.date].present++;
    });
    
    const dates = Object.keys(dateMap).sort();
    const percentages = dates.map(d => Math.round((dateMap[d].present / dateMap[d].total) * 100));
    
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    if (window.analyticsChart) window.analyticsChart.destroy();
    window.analyticsChart = new Chart(ctx, {
        type: 'line',
        data: { labels: dates, datasets: [{ label: 'Attendance %', data: percentages, borderColor: '#4361ee', fill: false }] }
    });
}