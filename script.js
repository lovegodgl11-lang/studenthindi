// --- GET HTML ELEMENTS ---
const startBtn = document.getElementById('startBtn');
const saveBtn = document.getElementById('saveBtn');
const newEntryBtn = document.getElementById('newEntryBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const exportBtn = document.getElementById('exportBtn');
const syncBtn = document.getElementById('syncBtn');

const statusDiv = document.getElementById('status');
const form = document.getElementById('studentForm');
const nameInput = document.getElementById('name');
const mobileInput = document.getElementById('mobile');
const mathInput = document.getElementById('math');
const scienceInput = document.getElementById('science');
const hindiInput = document.getElementById('hindi');
const tableBody = document.querySelector('#dataTable tbody');

// --- Global Variable ---
let editingRow = null; 
let studentRecords = [];
const appScriptUrl = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'; // <--- यहां अपना Google Apps Script URL डालें

// --- WEB SPEECH API SETUP ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    alert("Sorry, your browser doesn't support the Web Speech API. Please try Google Chrome.");
}
const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = 'hi-IN'; 
let keepListening = false;
let clappingAudio = null;

// Function to clear form inputs
function clearForm() {
    nameInput.value = '';
    mobileInput.value = '';
    mathInput.value = '';
    scienceInput.value = '';
    hindiInput.value = '';
    editingRow = null;
    statusDiv.textContent = 'Ready.';
    searchInput.value = '';
}

// --- FUNCTIONS ---
function speak(message, callback) {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(message);
    const hindiVoice = speechSynthesis.getVoices().find(voice => voice.lang === 'hi-IN' || voice.name.includes('Hindi'));
    if (hindiVoice) {
        utterance.voice = hindiVoice;
    } else {
        console.warn('Hindi voice not found. Using default.');
    }
    utterance.rate = 1.0;
    
    if (callback) {
        utterance.onend = callback;
    }
    
    window.speechSynthesis.speak(utterance);
}

// Function to play clapping sound
function playClapSound() {
    if (clappingAudio) {
        clappingAudio.pause();
        clappingAudio.currentTime = 0;
    }
    
    clappingAudio = new Audio('https://raw.githubusercontent.com/Anand-Sahani/Audio-files/main/applause.mp3');
    clappingAudio.play();
    
    setTimeout(() => {
        if (clappingAudio) {
            clappingAudio.pause();
            clappingAudio.currentTime = 0;
        }
    }, 10000); 
}

// Function to read mobile number digit by digit
function readMobileNumber(mobile) {
    const digits = mobile.split('');
    const digitWords = {
        '0': 'शून्य', '1': 'एक', '2': 'दो', '3': 'तीन', '4': 'चार',
        '5': 'पाँच', '6': 'छः', '7': 'सात', '8': 'आठ', '9': 'नौ'
    };
    const words = digits.map(digit => digitWords[digit] || digit);
    return words.join(' ');
}

// Function to read data aloud with headings
function readData(data) {
    const result = getResultStatus(data.math, data.science, data.hindi);
    
    const messages = [
        `आपका डेटा मिल गया है।`,
        `नाम: ${data.name}`,
        `मोबाइल नंबर: ${readMobileNumber(data.mobile)}`,
        `गणित में अंक: ${data.math}`,
        `विज्ञान में अंक: ${data.science}`,
        `हिंदी में अंक: ${data.hindi}`,
        `आपका रिजल्ट है: ${result.status}।`,
        `और आपका ग्रेड है: ${result.grade}।`
    ];

    let messageIndex = 0;
    const readNextMessage = () => {
        if (messageIndex < messages.length) {
            speak(messages[messageIndex], () => {
                messageIndex++;
                setTimeout(readNextMessage, 500); 
            });
        } else {
            if (result.status === 'Pass') {
                setTimeout(() => {
                    speak(`बधाई हो, आप पास हैं।`);
                    playClapSound();
                }, 1000); 
            }
        }
    };
    
    readNextMessage();
}

function getResultStatus(math, science, hindi) {
    const math_marks = parseInt(math);
    const science_marks = parseInt(science);
    const hindi_marks = parseInt(hindi);
    
    if (isNaN(math_marks) || isNaN(science_marks) || isNaN(hindi_marks) || math_marks < 33 || science_marks < 33 || hindi_marks < 33) {
        return { status: 'Fail', grade: '-' };
    }
    const totalMarks = math_marks + science_marks + hindi_marks;
    const percentage = (totalMarks / 300) * 100;

    let grade = 'Third';
    if (percentage >= 90) {
        grade = 'Excellent';
    } else if (percentage >= 60) {
        grade = 'First';
    } else if (percentage >= 50) {
        grade = 'Second';
    }
    return { status: 'Pass', grade: grade };
}

function searchAndLoadData(type, value) {
    statusDiv.textContent = `Searching for ${type}: ${value}...`;
    let filteredRecords = [];
    let recordFound = null;

    if (type === 'name') {
        filteredRecords = studentRecords.filter(item => item.name && item.name.toLowerCase().includes(value.toLowerCase()));
    } else if (type === 'mobile') {
        filteredRecords = studentRecords.filter(item => item.mobile && item.mobile.toLowerCase().includes(value.toLowerCase()));
    } else if (type === 'row') {
        const rowIndex = parseInt(value, 10);
        recordFound = studentRecords.find(item => item.row === rowIndex);
        if (recordFound) filteredRecords = [recordFound];
    }
    
    displayFilteredData(filteredRecords);
    
    if (filteredRecords.length === 1) {
        const data = filteredRecords[0];
        nameInput.value = data.name;
        mobileInput.value = data.mobile;
        mathInput.value = data.math;
        scienceInput.value = data.science;
        hindiInput.value = data.hindi;
        editingRow = data.row;
        statusDiv.textContent = `Data for ${data.name} loaded. You can now edit it.`;
        readData(data);
    } else if (filteredRecords.length === 0) {
        statusDiv.textContent = `No data found for ${value}.`;
        speak(`माफ़ करना, कोई डेटा नहीं मिला।`);
        clearForm();
    } else {
        statusDiv.textContent = `${filteredRecords.length} records found. Please refine your search.`;
        speak(`${filteredRecords.length} रिकॉर्ड्स मिले। कृपया अपनी खोज को और सटीक करें।`);
        clearForm();
    }
}

function submitOrUpdateData() {
    if (!nameInput.value.trim() || !mobileInput.value.trim()) {
        statusDiv.textContent = 'Error: Name and Mobile are required fields.';
        speak('नाम और मोबाइल नंबर खाली नहीं हो सकते। कृपया भरें।');
        return;
    }

    const formData = {
        name: nameInput.value,
        mobile: mobileInput.value,
        math: mathInput.value,
        science: scienceInput.value,
        hindi: hindiInput.value,
    };

    if (editingRow !== null) {
        const indexToUpdate = studentRecords.findIndex(item => item.row === editingRow);
        if (indexToUpdate !== -1) {
            studentRecords[indexToUpdate] = { ...formData, row: editingRow };
            statusDiv.textContent = 'Data updated successfully!';
            speak('डेटा सफलतापूर्वक अपडेट हो गया है।');
        }
    } else {
        const newRow = studentRecords.length > 0 ? studentRecords[studentRecords.length - 1].row + 1 : 1;
        studentRecords.push({ ...formData, row: newRow });
        statusDiv.textContent = 'New data saved successfully!';
            speak('नया डेटा सफलतापूर्वक सेव हो गया है।');
    }
    
    saveDataToLocalStorage();
    clearForm();
    fetchAndDisplayData();
}

function deleteRecord(row) {
    if (confirm("Are you sure you want to delete this record?")) {
        statusDiv.textContent = `Deleting row ${row}...`;
        speak(`रो ${row} के लिए रिकॉर्ड डिलीट किया जा रहा है।`);

        const indexToDelete = studentRecords.findIndex(item => item.row === parseInt(row));
        if (indexToDelete > -1) {
            studentRecords.splice(indexToDelete, 1);
            saveDataToLocalStorage();
            statusDiv.textContent = 'Record deleted successfully!';
            speak('रिकॉर्ड डिलीट हो गया है।');
            fetchAndDisplayData();
        } else {
            statusDiv.textContent = 'Error: Record not found for deletion.';
            speak('डिलीट करने के लिए रिकॉर्ड नहीं मिला।');
        }
    }
}

// --- NEW SYNC FUNCTION ---
async function syncDataOnline() {
    if (!navigator.onLine) {
        statusDiv.textContent = 'Offline. Cannot sync.';
        speak('आप ऑफ़लाइन हैं। सिंक नहीं कर सकते।');
        return;
    }
    
    if (studentRecords.length === 0) {
        statusDiv.textContent = 'No data to sync.';
        speak('सिंक करने के लिए कोई डेटा नहीं है।');
        return;
    }

    statusDiv.textContent = 'Syncing data to Google Sheets...';
    speak('डेटा को गूगल शीट्स में सिंक कर रहा हूँ।');

    try {
        const response = await fetch(appScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ records: studentRecords, action: 'sync' })
        });
        
        statusDiv.textContent = 'Sync successful!';
        speak('डेटा सफलतापूर्वक सिंक हो गया है।');

    } catch (error) {
        console.error('Error during sync:', error);
        statusDiv.textContent = 'Sync failed. Check your internet connection or URL.';
        speak('सिंक फेल हो गया। कृपया अपना इंटरनेट कनेक्शन या यूआरएल जाँचें।');
    }
}

// --- EXPORT FUNCTION ---
function exportDataAsCsv() {
    if (studentRecords.length === 0) {
        alert("No data to export.");
        return;
    }
    statusDiv.textContent = 'Exporting data...';
    
    const headers = ['Name', 'Mobile', 'Math', 'Science', 'Hindi', 'Result'];
    let csvContent = headers.join(',') + '\n';
    
    studentRecords.forEach(record => {
        const result = getResultStatus(record.math, record.science, record.hindi);
        const rowData = [
            `"${record.name.replace(/"/g, '""')}"`,
            `"${record.mobile.replace(/"/g, '""')}"`,
            record.math,
            record.science,
            record.hindi,
            `"${result.status} (${result.grade})"`
        ];
        csvContent += rowData.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'student_data.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    statusDiv.textContent = 'Data exported successfully as student_data.csv!';
    speak('डेटा सफलतापूर्वक एक्सपोर्ट हो गया है।');
}

// --- LOCAL STORAGE FUNCTIONS ---
function saveDataToLocalStorage() {
    try {
        localStorage.setItem('studentRecords', JSON.stringify(studentRecords));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
        alert('Error: Could not save data to your browser. Please check your browser settings.');
    }
}

function loadDataFromLocalStorage() {
    try {
        const storedData = localStorage.getItem('studentRecords');
        if (storedData) {
            studentRecords = JSON.parse(storedData);
        }
    } catch (e) {
        console.error('Error loading from localStorage:', e);
        alert('Error: Could not load data from your browser. Data might be corrupted.');
    }
}

function fetchAndDisplayData() {
    statusDiv.textContent = 'Loading all data...';
    displayFilteredData(studentRecords);
    statusDiv.textContent = 'All data loaded successfully.';
}

function displayFilteredData(records) {
    tableBody.innerHTML = '';
    if (records && records.length > 0) {
        records.forEach(item => {
            const result = getResultStatus(item.math, item.science, item.hindi);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.mobile}</td>
                <td>${item.math}</td>
                <td>${item.science}</td>
                <td>${item.hindi}</td>
                <td>${result.status} (${result.grade})</td>
                <td>
                    <button class="editBtn" onclick="editRow('${item.row}')">Edit</button>
                    <button class="deleteBtn" onclick="deleteRecord('${item.row}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        const noDataRow = document.createElement('tr');
        noDataRow.innerHTML = `<td colspan="7">No records found.</td>`;
        tableBody.appendChild(noDataRow);
    }
}

function editRow(row) {
    statusDiv.textContent = `Editing row ${row}...`;
    speak(`रो ${row} को एडिट कर रहे हैं।`);
    searchAndLoadData('row', row);
}

// --- EVENT LISTENERS ---
startBtn.addEventListener('click', () => {
    keepListening = !keepListening;
    if (keepListening) {
        recognition.start();
        startBtn.textContent = '🛑 Listening...';
        startBtn.style.backgroundColor = '#dc3545';
        speak('बोलें', () => {});
    } else {
        recognition.stop();
        startBtn.textContent = '🎤 Start Listening';
        startBtn.style.backgroundColor = '#28a745';
    }
});

saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    submitOrUpdateData();
});

newEntryBtn.addEventListener('click', (e) => {
    e.preventDefault();
    clearForm();
    fetchAndDisplayData();
});

searchBtn.addEventListener('click', () => {
    const value = searchInput.value.trim();
    if (value) {
        const searchType = isNaN(value) ? 'name' : 'mobile';
        searchAndLoadData(searchType, value);
    } else {
        fetchAndDisplayData();
        alert('Please enter a name or mobile number to search, or leave empty to show all data.');
    }
});

syncBtn.addEventListener('click', () => {
    syncDataOnline();
});

exportBtn.addEventListener('click', () => {
    exportDataAsCsv();
});

recognition.onstart = () => { statusDiv.textContent = 'Status: Listening...'; console.log('Voice recognition started.'); };
recognition.onend = () => { if (keepListening) { console.log('Restarting...'); recognition.start(); } else { console.log('Stopped.'); statusDiv.textContent = 'Status: Idle'; }};
recognition.onerror = (event) => { console.error('Error:', event.error); if (event.error !== 'no-speech') { statusDiv.textContent = `Error: ${event.error}`; } };
recognition.onresult = handleVoiceResult;

// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromLocalStorage();
    fetchAndDisplayData();
});