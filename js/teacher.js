// teacher.js - Final Working
let currentTeacher = null;
let currentClassId = null;
let currentSubjectId = null;

// Hardcoded teacher bypass
if (localStorage.getItem('role') === 'teacher') {
    window.getCurrentUser = async () => {
        return { id: 'teacher-1', email: 'teacher@school.com', role: 'teacher', name: 'Teacher' };
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    currentTeacher = await window.getCurrentUser();
    if (!currentTeacher || currentTeacher.role !== 'teacher') {
        alert('Access denied');
        window.location.href = 'login.html';
        return;
    }
    loadTeacherClasses();
});

async function loadTeacherClasses() {
    const { data } = await window.supabase.from('classes').select('*');
    const select = document.getElementById('classSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Select Class</option>';
    (data || []).forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.name} ${c.section || ''}</option>`;
    });
}

async function loadSubjectsForClass() {
    const classId = document.getElementById('classSelect').value;
    if (!classId) return;
    currentClassId = classId;
    const { data } = await window.supabase.from('subjects').select('*');
    const subjectSelect = document.getElementById('subjectSelect');
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    (data || []).forEach(s => {
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
    
    const container = document.getElementById('attendanceTable');
    if (!students || students.length === 0) {
        container.innerHTML = '<p>No students in this class.</p>';
        document.getElementById('attendanceCard').style.display = 'block';
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attDate').innerText = today;
    document.getElementById('attendanceCard').style.display = 'block';
    
    const { data: existing } = await window.supabase
        .from('attendance_new')
        .select('student_id, status')
        .eq('subject_id', currentSubjectId)
        .eq('date', today);
    
    const attMap = {};
    (existing || []).forEach(e => attMap[e.student_id] = e.status);
    
    let html = '<table><thead><tr><th>Roll</th><th>Name</th><th>Status</th></tr></thead><tbody>';
    students.forEach(s => {
        let status = attMap[s.id] || 'Present';
        html += `<tr>
            <td>${s.roll}</td>
            <td>${s.name}</td>
            <td>
                <select data-student="${s.id}" class="att-status">
                    <option ${status === 'Present' ? 'selected' : ''}>Present</option>
                    <option ${status === 'Absent' ? 'selected' : ''}>Absent</option>
                    <option ${status === 'Late' ? 'selected' : ''}>Late</option>
                </select>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function saveAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const selects = document.querySelectorAll('.att-status');
    for (let sel of selects) {
        const studentId = parseInt(sel.dataset.student);
        const status = sel.value;
        await window.supabase.from('attendance_new').delete()
            .eq('student_id', studentId)
            .eq('subject_id', currentSubjectId)
            .eq('date', today);
        await window.supabase.from('attendance_new').insert([{
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
        .from('attendance_new')
        .select('*, students(name, roll)')
        .eq('class_id', currentClassId)
        .eq('subject_id', currentSubjectId);
    // ... report generation
    alert('Report feature - check console');
    console.log(data);
}

async function showAnalytics() {
    alert('Analytics feature - implement if needed');
}