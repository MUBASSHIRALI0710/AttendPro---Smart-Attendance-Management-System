// Firebase Configuration for AttendPro
const firebaseConfig = {
    apiKey: "AIzaSyB9ZiveeqG6qwSXyqX7UZThNyaH9agFdBs",
    authDomain: "attendpro-e7706.firebaseapp.com",
    projectId: "attendpro-e7706",
    storageBucket: "attendpro-e7706.firebasestorage.app",
    messagingSenderId: "52026174828",
    appId: "1:52026174828:web:f083ae57cc570b78e05749"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence().catch((err) => {
    console.warn("Offline persistence error:", err);
});

// Global students array
window.students = [];

// Load students from cloud
window.loadStudentsFromCloud = async function() {
    try {
        const snapshot = await db.collection('students').get();
        window.students = [];
        snapshot.forEach(doc => {
            window.students.push({ id: doc.id, ...doc.data() });
        });
        window.students.sort((a, b) => Number(a.roll) - Number(b.roll));
        console.log('✅ Loaded', window.students.length, 'students from cloud');
        return true;
    } catch (error) {
        console.error('❌ Error loading:', error);
        return false;
    }
};

// Save students to cloud
window.saveStudentsToCloud = async function() {
    try {
        const snapshot = await db.collection('students').get();
        const batch = db.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        
        for (const student of window.students) {
            await db.collection('students').add({
                name: student.name,
                roll: student.roll,
                attendance: student.attendance || {},
                enrollmentDate: student.enrollmentDate || new Date().toISOString(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        console.log('✅ Saved', window.students.length, 'students to cloud');
        return true;
    } catch (error) {
        console.error('❌ Error saving:', error);
        return false;
    }
};

// Auto-load on page load
document.addEventListener('DOMContentLoaded', () => {
    window.loadStudentsFromCloud();
});

console.log('🔥 Firebase configured!');