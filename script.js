document.addEventListener('DOMContentLoaded', () => {
    const slides = document.querySelectorAll('main section');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    let currentSlide = 0;

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === slides.length - 1;
    }

    prevBtn.addEventListener('click', () => {
        if (currentSlide > 0) {
            currentSlide--;
            showSlide(currentSlide);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) {
            currentSlide++;
            showSlide(currentSlide);
        }
    });

    showSlide(currentSlide);

    // --- Sensor and Chart Logic ---
    const startStopButton = document.getElementById('startStopButton');
    const permissionStatus = document.getElementById('permissionStatus');
    let isRunning = false;
    let sensor = null;

    const ctx = document.getElementById('accelerometerChart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'X', borderColor: '#ff6384', data: [], fill: false, tension: 0.1 },
                { label: 'Y', borderColor: '#36a2eb', data: [], fill: false, tension: 0.1 },
                { label: 'Z', borderColor: '#4bc0c0', data: [], fill: false, tension: 0.1 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#e0e0e0' } } },
            scales: {
                x: { title: { display: true, text: 'Time', color: '#e0e0e0' }, ticks: { color: '#e0e0e0' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                y: { title: { display: true, text: 'Acceleration (m/s²)', color: '#e0e0e0' }, suggestedMin: -20, suggestedMax: 20, ticks: { color: '#e0e0e0' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
            }
        }
    });

    function addData(x, y, z) {
        const time = new Date().toLocaleTimeString();
        chart.data.labels.push(time);
        chart.data.datasets[0].data.push(x);
        chart.data.datasets[1].data.push(y);
        chart.data.datasets[2].data.push(z);
        if (chart.data.labels.length > 50) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => dataset.data.shift());
        }
        chart.update();
    }

    // --- Sensor Handling ---

    // For iOS devices
    function handleDeviceMotion(event) {
        const accel = event.acceleration;
        if (accel && accel.x !== null) {
            addData(accel.x, accel.y, accel.z);
        }
    }

    // For Android/Chrome devices
    function handleSensorReading() {
        if(sensor) {
            addData(sensor.x, sensor.y, sensor.z);
        }
    }

    function stopSensor() {
        if (sensor) {
            // Generic Sensor API (Chrome)
            if (typeof sensor.stop === 'function') {
                sensor.stop();
            }
            sensor = null;
        }
        // DeviceMotionEvent API (iOS)
        window.removeEventListener('devicemotion', handleDeviceMotion);
        
        isRunning = false;
        startStopButton.textContent = '실시간 데이터 측정 시작';
        permissionStatus.textContent = '센서가 비활성화되었습니다.';
    }

    startStopButton.addEventListener('click', () => {
        if (isRunning) {
            stopSensor();
            return;
        }

        // Path A: For iOS 13+ (and iOS 18+)
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('devicemotion', handleDeviceMotion);
                        isRunning = true;
                        startStopButton.textContent = '실시간 데이터 측정 중지';
                        permissionStatus.textContent = '센서가 활성화되었습니다. 스마트폰을 움직여보세요.';
                    } else {
                        permissionStatus.textContent = '권한 거부됨. Safari 설정 > 개인정보 보호에서 \'크로스-사이트 추적 방지\'가 꺼져 있는지 확인하세요.';
                    }
                })
                .catch(console.error);
        } 
        // Path B: For modern browsers like Chrome (Android)
        else if ('LinearAccelerationSensor' in window) {
            try {
                sensor = new LinearAccelerationSensor({ frequency: 10 });
                sensor.addEventListener('reading', handleSensorReading);
                sensor.addEventListener('error', (event) => {
                    permissionStatus.textContent = `오류: ${event.error.name} - ${event.error.message}`;
                    stopSensor();
                });
                sensor.start();
                isRunning = true;
                startStopButton.textContent = '실시간 데이터 측정 중지';
                permissionStatus.textContent = '센서가 활성화되었습니다. 스마트폰을 움직여보세요.';
            } catch (error) {
                permissionStatus.textContent = `센서 시작 오류: ${error.message}`;
            }
        } 
        // Path C: Not supported
        else {
            permissionStatus.textContent = '이 기기 또는 브라우저에서는 가속도 센서를 지원하지 않습니다.';
        }
    });
});
