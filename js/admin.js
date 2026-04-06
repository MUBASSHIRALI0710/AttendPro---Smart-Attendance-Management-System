// admin.js - FRESH WORKING COPY
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    // For testing - bypass login check temporarily
    // Remove this after everything works
    window.getCurrentUser = async () => {
        return { id: 'test-id', email: 'admin@school.com', role: 'admin', name: 'Admin' };
    };
    
    currentUser = await window.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Access denied. Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }
    loadClasses();
    loadSubjects();
    loadTeachers();
    loadStudents();
    loadClassSubjectsForAssign();
});

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId + 'Tab').classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

async function createClass() {
    const name = document.getElementById('className').value;
    const section = document.getElementById('classSection').value;
    if (!name) return alert('Class name required');
    const { error } = await window.supabase.from('classes').insert([{ name, section }]);
    if (error) { alert('Error: ' + error.message); return; }
    document.getElementById('className').value = '';
    document.getElementById('classSection').value = '';
    loadClasses();
    alert('Class added successfully!');
}

async function loadClasses() {
    const { data } = await window.supabase.from('classes').select('*').order('name');
    const container = document.getElementById('classList');
    if (!container) return;
    container.innerHTML = data.map(c => `<div class="list-item">${c.name} ${c.section || ''} <button onclick="deleteClass(${c.id})">Delete</button></div>`).join('');
    const select = document.getElementById('studentClass');
    if (select) select.innerHTML = data.map(c => `<option value="${c.id}">${c.name} ${c.section || ''}</option>`).join('');
    const assignClass = document.getElementById('assignClass');
    if (assignClass) assignClass.innerHTML = '<option value="">Select Class</option>' + data.map(c => `<option value="${c.id}">${c.name} ${c.section || ''}</option>`).join('');
}

async function deleteClass(id) {
    await window.supabase.from('classes').delete().eq('id', id);
    loadClasses();
}

async function createSubject() {
    const name = document.getElementById('subjectName').value;
    if (!name) return alert('Subject name required');
    const { error } = await window.supabase.from('subjects').insert([{ name }]);
    if (error) { alert('Error: ' + error.message); return; }
    document.getElementById('subjectName').value = '';
    loadSubjects();
    alert('Subject added successfully!');
}

async function loadSubjects() {
    const { data } = await window.supabase.from('subjects').select('*').order('name');
    const container = document.getElementById('subjectList');
    if (!container) return;
    container.innerHTML = data.map(s => `<div class="list-item">${s.name} <button onclick="deleteSubject(${s.id})">Delete</button></div>`).join('');
    const assignSubject = document.getElementById('assignSubject');
    if (assignSubject) assignSubject.innerHTML = '<option value="">Select Subject</option>' + data.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

async function deleteSubject(id) {
    await window.supabase.from('subjects').delete().eq('id', id);
    loadSubjects();
}

async function createTeacher() {
    const email = document.getElementById('teacherEmail').value;
    const name = document.getElementById('teacherName').value;
    const password = document.getElementById('teacherPass').value;
    if (!email || !name || !password) return alert('All fields required');
    const { data, error } = await window.supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);
    await window.supabase.from('users').insert([{ id: data.user.id, email, name, role: 'teacher' }]);
    alert('Teacher created!');
    document.getElementById('teacherEmail').value = '';
    document.getElementById('teacherName').value = '';
    document.getElementById('teacherPass').value = '';
    loadTeachers();
}

async function loadTeachers() {
    const { data } = await window.supabase.from('users').select('id, name, email').eq('role', 'teacher');
    const container = document.getElementById('teacherList');
    if (!container) return;
    container.innerHTML = data.map(t => `<div class="list-item">${t.name} (${t.email}) <button onclick="deleteTeacher('${t.id}')">Delete</button></div>`).join('');
    const assignTeacher = document.getElementById('assignTeacher');
    if (assignTeacher) assignTeacher.innerHTML = '<option value="">Select Teacher</option>' + data.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

async function deleteTeacher(id) {
    await window.supabase.from('users').delete().eq('id', id);
    loadTeachers();
}

async function createStudent() {
    const classId = document.getElementById('studentClass').value;
    const roll = document.getElementById('studentRoll').value;
    const name = document.getElementById('studentName').value;
    const email = document.getElementById('studentEmail').value;
    const password = document.getElementById('studentPass').value;
    if (!classId || !roll || !name || !email || !password) return alert('All fields required');
    const { data, error } = await window.supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);
    await window.supabase.from('users').insert([{ id: data.user.id, email, name, role: 'student' }]);
    await window.supabase.from('students').insert([{ user_id: data.user.id, roll_number: roll, class_id: classId, name: name, roll: roll, attendance: {} }]);
    alert('Student created!');
    document.getElementById('studentRoll').value = '';
    document.getElementById('studentName').value = '';
    document.getElementById('studentEmail').value = '';
    document.getElementById('studentPass').value = '';
    loadStudents();
}

async function loadStudents() {
    const { data } = await window.supabase.from('students').select('*, users(name), classes(name, section)');
    const container = document.getElementById('studentList');
    if (!container) return;
    container.innerHTML = data.map(s => `<div class="list-item">${s.users?.name || s.name} (Roll: ${s.roll_number || s.roll}) - Class: ${s.classes?.name || ''} ${s.classes?.section || ''} <button onclick="deleteStudent(${s.id})">Delete</button></div>`).join('');
}

async function deleteStudent(id) {
    await window.supabase.from('students').delete().eq('id', id);
    loadStudents();
}

async function loadClassSubjectsForAssign() {
    await loadClasses();
    await loadSubjects();
    await loadTeachers();
    const { data } = await window.supabase.from('class_subjects').select('*, classes(name, section), subjects(name), users(name)');
    const container = document.getElementById('assignList');
    if (!container) return;
    container.innerHTML = data.map(cs => `<div class="list-item">Class: ${cs.classes?.name || ''} ${cs.classes?.section || ''} | Subject: ${cs.subjects?.name || ''} | Teacher: ${cs.users?.name || ''} <button onclick="unassign(${cs.id})">Remove</button></div>`).join('');
}

async function assignSubjectToClass() {
    const classId = document.getElementById('assignClass').value;
    const subjectId = document.getElementById('assignSubject').value;
    const teacherId = document.getElementById('assignTeacher').value;
    if (!classId || !subjectId || !teacherId) return alert('Select all');
    const { error } = await window.supabase.from('class_subjects').insert([{ class_id: classId, subject_id: subjectId, teacher_id: teacherId }]);
    if (error) { alert('Error: ' + error.message); return; }
    alert('Assigned successfully!');
    loadClassSubjectsForAssign();
}

async function unassign(id) {
    await window.supabase.from('class_subjects').delete().eq('id', id);
    loadClassSubjectsForAssign();
}