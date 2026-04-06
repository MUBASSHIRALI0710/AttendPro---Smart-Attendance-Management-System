// supabase-config.js - FRESH WORKING COPY
const SUPABASE_URL = 'https://mmdttrqxzhfjxlgsqxnj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZHR0cnF4emhmanhsZ3NxeG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTcxMzcsImV4cCI6MjA5MDk3MzEzN30.vAmLV3lXRwnJ4vPFnF7cYCHjHGnKbyCbiYlIoxqYVQE';

// Create supabase client
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = _supabase;

// Global students array
window.students = [];

// Load students
window.loadStudentsFromCloud = async function() {
    try {
        const { data, error } = await window.supabase
            .from('students')
            .select('*')
            .order('roll', { ascending: true });
        if (error) throw error;
        window.students = data.map(s => ({
            id: s.id,
            name: s.name,
            roll: String(s.roll),
            attendance: s.attendance || {},
            enrollmentDate: s.enrollmentDate
        }));
        console.log('✅ Loaded', window.students.length, 'students');
        return true;
    } catch (err) {
        console.error('❌ Load error:', err);
        return false;
    }
};

// Save students
window.saveStudentsToCloud = async function() {
    try {
        const { error: delErr } = await window.supabase
            .from('students')
            .delete()
            .neq('id', 0);
        if (delErr) throw delErr;
        if (window.students.length === 0) return true;
        const toInsert = window.students.map(s => ({
            roll: String(s.roll),
            name: s.name,
            attendance: s.attendance || {},
            enrollmentDate: s.enrollmentDate || new Date().toISOString()
        }));
        const { error: insErr } = await window.supabase
            .from('students')
            .insert(toInsert);
        if (insErr) throw insErr;
        console.log('✅ Saved', window.students.length, 'students');
        return true;
    } catch (err) {
        console.error('❌ Save error:', err);
        return false;
    }
};

// Get current user
window.getCurrentUser = async () => {
    const { data: { user }, error } = await window.supabase.auth.getUser();
    if (error || !user) return null;
    const { data: userData } = await window.supabase
        .from('users')
        .select('role, name')
        .eq('id', user.id)
        .single();
    return { ...user, role: userData?.role, name: userData?.name };
};

// Logout
window.logout = async () => {
    await window.supabase.auth.signOut();
    localStorage.clear();
    window.location.href = 'login.html';
};

console.log('✅ Supabase ready');