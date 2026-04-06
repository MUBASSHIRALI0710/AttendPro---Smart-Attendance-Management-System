let currentTeacher = null;
let currentClassId = null;
let currentSubjectId = null;
let studentsList = [];
let attendanceData = {};

document.addEventListener('DOMContentLoaded', async () => {
    currentTeacher = await getCurrentUser();
    if (!currentTeacher || currentTeacher.role !== 'teacher') {
        alert('Access denied');
        window.location.href = 'login.html';
        return;
    }
    loadTeacherClasses();
});

async function loadTeacherClasses() {
    const { data } = await supabase
        .from('class_subjects')
        .select('class_id, classes(name, section)')
        .eq('teacher_id', currentTeacher.id);
    const classSelect = document.getElementById('classSelect');
    classSelect.innerHTML = '<option value="">Select Class</option>';
    data.forEach(cs => {
        classSelect.innerHTML += `<option value="${cs.class_id}">${cs.classes.name} ${cs.classes.section || ''}</option>`;
    });
}

async function loadSubjectsForClass() {
    const classId = document.getElementById('classSelect').value;
    if (!classId) return;
    currentClassId = classId;
    const { data } = await supabase
        .from('class_subjects')
        .select('subject_id, subjects(name)')
        .eq('class_id', classId)
        .eq('teacher_id', currentTeacher.id);
    const subjectSelect = document.getElementById('subjectSelect');
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    data.forEach(cs => {
        subjectSelect.innerHTML += `<option value="${cs.subject_id}">${cs.subjects.name}</option>`;
    });
}

async function loadStudentsForAttendance() {
    const subjectId = document.getElementById('subjectSelect').value;
    if (!subjectId) return;
    currentSubjectId = subjectId;
    // Get students of this class
    const { data: students } = await supabase
        .from('students')
        .select('id, roll_number, users(name)')
        .eq('class_id', currentClassId);
    studentsList = students;
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attDate').innerText = today;
    document.getElementById('attendanceCard').style.display = 'block';
    // Check existing attendance for today & this subject
    const { data: existing } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('subject_id', currentSubjectId)
        .eq('date', today)
        .eq('class_id', currentClassId);
    let attMap = {};
    existing.forEach(e => attMap[e.student_id] = e.status);
    let html = '<table><thead><tr><th>Roll</th><th>Student</th><th>Status</th></tr></thead><tbody>';
    students.forEach(s => {
        let status = attMap[s.id] || 'Present';
        html += `<tr>
            <td>${s.roll_number}</td>
            <td>${s.users.name}</td>
            <td>
                <select data-student="${s.id}" class="att-status">
                    <option ${status==='Present'?'selected':''}>Present</option>
                    <option ${status==='Absent'?'selected':''}>Absent</option>
                    <option ${status==='Late'?'selected':''}>Late</option>
                </select>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('attendanceTable').innerHTML = html;
}

async function saveAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const selects = document.querySelectorAll('.att-status');
    for (let sel of selects) {
        const studentId = parseInt(sel.dataset.student);
        const status = sel.value;
        // Upsert: delete existing then insert
        await supabase.from('attendance').delete()
            .eq('student_id', studentId)
            .eq('subject_id', currentSubjectId)
            .eq('date', today);
        await supabase.from('attendance').insert([{
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
    const { data } = await supabase
        .from('attendance')
        .select('student_id, students(roll_number, users(name)), status, date')
        .eq('class_id', currentClassId)
        .eq('subject_id', currentSubjectId);
    // Group by student
    let reportHtml = '<h4>Attendance Report</h4><table><tr><th>Roll</th><th>Name</th><th>Present</th><th>Absent</th><th>Late</th><th>%</th></tr>';
    let studentMap = {};
    data.forEach(a => {
        if (!studentMap[a.student_id]) studentMap[a.student_id] = { present:0, absent:0, late:0, name: a.students.users.name, roll: a.students.roll_number };
        if (a.status === 'Present') studentMap[a.student_id].present++;
        else if (a.status === 'Absent') studentMap[a.student_id].absent++;
        else studentMap[a.student_id].late++;
    });
    for (let sid in studentMap) {
        let s = studentMap[sid];
        let total = s.present + s.absent + s.late;
        let percent = total===0?0:Math.round((s.present/total)*100);
        reportHtml += `<tr><td>${s.roll}</td><td>${s.name}</td><td>${s.present}</td><td>${s.absent}</td><td>${s.late}</td><td>${percent}%</td></tr>`;
    }
    reportHtml += '</table>';
    document.getElementById('reportContainer').innerHTML = reportHtml;
}

async function showAnalytics() {
    const { data } = await supabase
        .from('attendance')
        .select('date, status')
        .eq('class_id', currentClassId)
        .eq('subject_id', currentSubjectId);
    // Group by date
    let dateMap = {};
    data.forEach(a => {
        if (!dateMap[a.date]) dateMap[a.date] = { total:0, present:0 };
        dateMap[a.date].total++;
        if (a.status === 'Present') dateMap[a.date].present++;
    });
    let dates = Object.keys(dateMap).sort();
    let percentages = dates.map(d => Math.round((dateMap[d].present/dateMap[d].total)*100));
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: { labels: dates, datasets: [{ label: 'Attendance %', data: percentages, borderColor: '#4361ee' }] }
    });
}