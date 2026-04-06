// student_dash.js - Fixed for hardcoded student login
let currentStudent = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Get roll from localStorage (set by login.html)
    let roll = localStorage.getItem('studentRoll');
    if (!roll) {
        alert('No student logged in. Please login again.');
        window.location.href = 'login.html';
        return;
    }
    
    // Fetch student details from Supabase (using old students table)
    const { data: studentData, error } = await window.supabase
        .from('students')
        .select('id, name, roll, class_id')
        .eq('roll', roll)
        .single();
    
    if (error || !studentData) {
        alert('Student not found. Please contact admin.');
        window.location.href = 'login.html';
        return;
    }
    
    currentStudent = studentData;
    document.getElementById('studentName').innerText = currentStudent.name;
    document.getElementById('studentRoll').innerText = currentStudent.roll;
    
    loadSubjectWiseAttendance();
});

async function loadSubjectWiseAttendance() {
    // Get all subjects for this student's class
    const { data: classSubjects } = await window.supabase
        .from('class_subjects')
        .select('subject_id, subjects(name)')
        .eq('class_id', currentStudent.class_id);
    
    if (!classSubjects || classSubjects.length === 0) {
        document.getElementById('attendanceDetails').innerHTML = '<p>No subjects assigned to your class.</p>';
        return;
    }
    
    // Get attendance records for this student from new attendance table
    const { data: attendance } = await window.supabase
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
    let detailsHtml = '<table class="attendance-table"><thead><tr><th>Subject</th><th>Present</th><th>Total</th><th>%</th></tr></thead><tbody>';
    
    for (let sid in subjectMap) {
        let s = subjectMap[sid];
        labels.push(s.name);
        let percent = s.total === 0 ? 0 : Math.round((s.present / s.total) * 100);
        percentages.push(percent);
        detailsHtml += '<tr>' +
            '<td>' + s.name + '</td>' +
            '<td>' + s.present + '</td>' +
            '<td>' + s.total + '</td>' +
            '<td>' + percent + '%</td>' +
            '</tr>';
    }
    detailsHtml += '</tbody></table>';
    document.getElementById('attendanceDetails').innerHTML = detailsHtml;
    
    // Draw chart
    const ctx = document.getElementById('subjectChart').getContext('2d');
    if (window.subjectChart) window.subjectChart.destroy();
    window.subjectChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Attendance %', data: percentages, backgroundColor: '#4361ee' }] },
        options: { scales: { y: { max: 100, beginAtZero: true } } }
    });
}