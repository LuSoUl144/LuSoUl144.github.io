document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const slides = document.querySelectorAll('main section');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const serverStatus = document.getElementById('serverStatus');
    const roleSelection = document.getElementById('role-selection');
    const presenterControls = document.getElementById('presenter-controls');
    const audienceView = document.getElementById('audience-view');
    const presenterBtn = document.getElementById('presenterBtn');
    const audienceBtn = document.getElementById('audienceBtn');
    const startStopButton = document.getElementById('startStopButton');
    const pauseResumeButton = document.getElementById('pauseResumeButton');
    const clearButton = document.getElementById('clearButton');
    const permissionStatus = document.getElementById('permissionStatus');
    const audienceStatus = document.getElementById('audienceStatus');

    // --- State Variables ---
    let currentSlide = 0;
    let chart = null;
    let isChartInitialized = false;
    let sensor, motionListener;
    let isRunning = false;
    let isPaused = false;
    let lastReading = { x: 0, y: 0, z: 0 };
    let socket;
    let userRole = null;

    // --- Slides Navigation (with new animation classes) ---
    function showSlide(newIndex) {
        const oldIndex = currentSlide;
        if (newIndex === oldIndex) return;

        slides[oldIndex].classList.remove('active');
        slides[oldIndex].classList.add('prev');

        slides[newIndex].classList.remove('prev');
        slides[newIndex].classList.add('active');
        
        currentSlide = newIndex;

        prevBtn.disabled = newIndex === 0;
        nextBtn.disabled = newIndex === slides.length - 1;

        // Show header only on the first slide
        mainHeader.style.display = newIndex === 0 ? 'block' : 'none';

        if (slides[newIndex].id === 'demo') {
            initializeChart();
            if (!socket) connectToServer();
        }
    }
    prevBtn.addEventListener('click', () => { if (currentSlide > 0) showSlide(currentSlide - 1); });
    nextBtn.addEventListener('click', () => { if (currentSlide < slides.length - 1) showSlide(currentSlide + 1); });
    slides[0].classList.add('active'); // Set initial slide

    // --- Chart Logic ---
    function initializeChart() {
        if (isChartInitialized) return;
        const ctx = document.getElementById('accelerometerChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [
                { label: 'X', data: [], borderColor: '#ff6384', fill: false, tension: 0.2 },
                { label: 'Y', data: [], borderColor: '#4bc0c0', fill: false, tension: 0.2 },
                { label: 'Z', data: [], borderColor: '#36a2eb', fill: false, tension: 0.2 }
            ] },
            options: { responsive: true, maintainAspectRatio: false, /* ... other options ... */ }
        });
        isChartInitialized = true;
    }

    function updateChart(data) {
        if (!isChartInitialized || isPaused) return;
        const time = new Date().toLocaleTimeString();
        chart.data.labels.push(time);
        chart.data.datasets.forEach((dataset, i) => {
            const key = dataset.label.toLowerCase();
            dataset.data.push(data[key]);
        });
        if (chart.data.labels.length > 50) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => dataset.data.shift());
        }
        chart.update('none');
    }

    function clearChart() {
        if (!isChartInitialized) return;
        chart.data.labels = [];
        chart.data.datasets.forEach(dataset => dataset.data = []);
        chart.update();
    }

    // --- WebSocket Connection ---
    function connectToServer() {
        socket = io("https://sccs-realtime-server.onrender.com");
        socket.on('connect', () => serverStatus.textContent = '서버에 연결되었습니다.');
        socket.on('disconnect', () => serverStatus.textContent = '서버 연결이 끊어졌습니다.');
        socket.on('role_assigned', (role) => {
            userRole = role;
            roleSelection.style.display = 'none';
            if (role === 'presenter') presenterControls.style.display = 'block';
            else audienceView.style.display = 'block';
        });
        socket.on('role_assign_failure', (message) => alert(message));
        socket.on('graph_update', (data) => {
            if (userRole === 'audience') {
                updateChart(data);
                audienceStatus.textContent = '발표자의 데이터를 실시간으로 보고 있습니다.';
            }
        });
        socket.on('clear_chart', () => clearChart());
    }

    presenterBtn.addEventListener('click', () => socket.emit('select_role', 'presenter'));
    audienceBtn.addEventListener('click', () => socket.emit('select_role', 'audience'));

    // --- Sensor Logic (for Presenter) ---
    function sensorLoop() {
        if (!isRunning) return;
        if (!isPaused) {
            updateChart(lastReading);
            socket.emit('sensor_data', lastReading);
        }
        requestAnimationFrame(sensorLoop);
    }

    const handleDeviceMotion = (event) => {
        const accel = event.accelerationIncludingGravity || event.acceleration;
        if (accel) lastReading = { x: accel.x, y: accel.y, z: accel.z };
    };

    function startSensor() {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission().then(state => {
                if (state === 'granted') {
                    window.addEventListener('devicemotion', handleDeviceMotion);
                    isRunning = true;
                    startStopButton.textContent = '측정 중지';
                    permissionStatus.textContent = '실시간 데이터를 전송하고 있습니다.';
                    sensorLoop();
                }
            });
        } else {
            window.addEventListener('devicemotion', handleDeviceMotion);
            isRunning = true;
            startStopButton.textContent = '측정 중지';
            permissionStatus.textContent = '실시간 데이터를 전송하고 있습니다.';
            sensorLoop();
        }
    }

    function stopSensor() {
        isRunning = false;
        window.removeEventListener('devicemotion', handleDeviceMotion);
        startStopButton.textContent = '측정 시작';
        permissionStatus.textContent = '전송이 중지되었습니다.';
    }

    startStopButton.addEventListener('click', () => {
        if (isRunning) stopSensor();
        else startSensor();
    });

    pauseResumeButton.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseResumeButton.textContent = isPaused ? '재개' : '일시정지';
    });

    clearButton.addEventListener('click', () => {
        clearChart();
        socket.emit('clear_chart');
    });
});
