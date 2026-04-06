let currentStudent = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== 'student') {
        alert('Access denied');
        window.location.href = 'login.html';
        return;
    }
    const { data: student } = await supabase
        .from('students')
        .select('id, roll_number, users(name), class_id')
        .eq('user_id', user.id)
        .single();
    currentStudent = student;
    document.getElementById('studentName').innerText = student.users.name;
    document.getElementById('studentRoll').innerText = student.roll_number;
    loadSubjectWiseAttendance();
});

async function loadSubjectWiseAttendance() {
    // Get all subjects for this student's class
    const { data: classSubjects } = await supabase
        .from('class_subjects')
        .select('subject_id, subjects(name)')
        .eq('class_id', currentStudent.class_id);
    // Get attendance records
    const { data: attendance } = await supabase
        .from('attendance')
        .select('subject_id, status')
        .eq('student_id', currentStudent.id);
    let subjectMap = {};
    classSubjects.forEach(cs => {
        subjectMap[cs.subject_id] = { name: cs.subjects.name, present: 0, total: 0 };
    });
    attendance.forEach(a => {
        if (subjectMap[a.subject_id]) {
            subjectMap[a.subject_id].total++;
            if (a.status === 'Present') subjectMap[a.subject_id].present++;
        }
    });
    const labels = [];
    const percentages = [];
    let detailsHtml = '<table><tr><th>Subject</th><th>Present</th><th>Total</th><th>%</th></tr>';
    for (let sid in subjectMap) {
        let s = subjectMap[sid];
        labels.push(s.name);
        let percent = s.total === 0 ? 0 : Math.round((s.present / s.total) * 100);
        percentages.push(percent);
        detailsHtml += `<tr><td>${s.name}</td><td>${s.present}</td><td>${s.total}</td><td>${percent}%</td></tr>`;
    }
    detailsHtml += '</table>';
    document.getElementById('attendanceDetails').innerHTML = detailsHtml;
    const ctx = document.getElementById('subjectChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Attendance %', data: percentages, backgroundColor: '#4361ee' }] },
        options: { scales: { y: { max: 100 } } }
    });
}