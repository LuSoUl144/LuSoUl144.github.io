document.addEventListener('DOMContentLoaded', () => {
    // --- Slides Navigation ---
    const slides = document.querySelectorAll('main section');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    let currentSlide = 0;

    function showSlide(index) {
        slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === slides.length - 1;
    }
    prevBtn.addEventListener('click', () => {
        if (currentSlide > 0) showSlide(--currentSlide);
    });
    nextBtn.addEventListener('click', () => {
        if (currentSlide < slides.length - 1) showSlide(++currentSlide);
    });
    showSlide(currentSlide);

    // --- Sensor and Chart Logic ---
    const startStopButton = document.getElementById('startStopButton');
    const permissionStatus = document.getElementById('permissionStatus');
    const ctx = document.getElementById('accelerometerChart').getContext('2d');
    
    let sensor, motionListener;
    let isRunning = false;
    let lastReading = { x: 0, y: 0, z: 0 };
    let animationFrameId;

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'X', borderColor: '#ff6384', data: [], fill: false, tension: 0.2 },
                { label: 'Y', borderColor: '#36a2eb', data: [], fill: false, tension: 0.2 },
                { label: 'Z', borderColor: '#4bc0c0', data: [], fill: false, tension: 0.2 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#e0e0e0' } } },
            scales: {
                x: { title: { display: true, text: 'Time', color: '#e0e0e0' }, ticks: { color: '#e0e0e0', maxTicksLimit: 10 }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                y: { title: { display: true, text: 'Acceleration (m/s²)', color: '#e0e0e0' }, suggestedMin: -15, suggestedMax: 15, ticks: { color: '#e0e0e0' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
            }
        }
    });

    function updateChart() {
        const time = new Date().toLocaleTimeString();
        chart.data.labels.push(time);
        chart.data.datasets[0].data.push(lastReading.x);
        chart.data.datasets[1].data.push(lastReading.y);
        chart.data.datasets[2].data.push(lastReading.z);

        if (chart.data.labels.length > 50) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => dataset.data.shift());
        }
        chart.update('none'); // Use 'none' for smoother animation
        animationFrameId = requestAnimationFrame(updateChart);
    }

    function stop() {
        if (sensor && typeof sensor.stop === 'function') {
            sensor.removeEventListener('reading', handleSensorReading);
            sensor.stop();
            sensor = null;
        }
        if (motionListener) {
            window.removeEventListener('devicemotion', motionListener);
            motionListener = null;
        }
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        isRunning = false;
        startStopButton.textContent = '실시간 데이터 측정 시작';
        permissionStatus.textContent = '센서가 비활성화되었습니다.';
    }

    const handleSensorReading = () => {
        if (sensor) {
            lastReading = { x: sensor.x, y: sensor.y, z: sensor.z };
        }
    };

    const handleDeviceMotion = (event) => {
        // Use accelerationIncludingGravity for iOS as it's more reliable
        const accel = event.accelerationIncludingGravity || event.acceleration;
        if (accel && typeof accel.x === 'number') {
            lastReading = { x: accel.x, y: accel.y, z: accel.z };
        }
    };

    function start() {
        // --- Try Generic Sensor API (Chrome on Android) ---
        if ('LinearAccelerationSensor' in window) {
            permissionStatus.textContent = '센서에 접근하는 중...';
            navigator.permissions.query({ name: 'accelerometer' }).then(result => {
                if (result.state === 'denied') {
                    permissionStatus.textContent = '가속도계 센서 사용 권한이 거부되었습니다.';
                    return;
                }
                try {
                    sensor = new LinearAccelerationSensor({ frequency: 20 });
                    sensor.addEventListener('reading', handleSensorReading);
                    sensor.addEventListener('error', (e) => {
                        permissionStatus.textContent = `센서 오류: ${e.error.name} - ${e.error.message}`;
                        stop();
                    });
                    sensor.start();
                } catch(e) {
                    permissionStatus.textContent = `센서 초기화 실패: ${e.message}`;
                    return;
                }
                
                isRunning = true;
                startStopButton.textContent = '실시간 데이터 측정 중지';
                permissionStatus.textContent = '센서 활성화됨. 폰을 움직여보세요.';
                animationFrameId = requestAnimationFrame(updateChart);
            });
        }
        // --- Try DeviceMotionEvent API (iOS and others) ---
        else if (typeof DeviceMotionEvent !== 'undefined') {
            motionListener = handleDeviceMotion;
            // For iOS 13+
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                permissionStatus.textContent = '센서 사용 권한을 요청합니다...';
                DeviceMotionEvent.requestPermission().then(state => {
                    if (state === 'granted') {
                        window.addEventListener('devicemotion', motionListener);
                        isRunning = true;
                        startStopButton.textContent = '실시간 데이터 측정 중지';
                        permissionStatus.textContent = '센서 활성화됨. 폰을 움직여보세요.';
                        animationFrameId = requestAnimationFrame(updateChart);
                    } else {
                        permissionStatus.textContent = '센서 사용 권한이 거부되었습니다.';
                    }
                }).catch(e => {
                    permissionStatus.textContent = `권한 요청 중 오류: ${e.message}`;
                });
            } else {
                // For older iOS and other browsers
                window.addEventListener('devicemotion', motionListener);
                isRunning = true;
                startStopButton.textContent = '실시간 데이터 측정 중지';
                permissionStatus.textContent = '센서 활성화됨. 폰을 움직여보세요.';
                animationFrameId = requestAnimationFrame(updateChart);
            }
        }
        // --- Not supported ---
        else {
            permissionStatus.textContent = '이 기기/브라우저에서는 가속도 센서를 지원하지 않습니다.';
        }
    }

    startStopButton.addEventListener('click', () => {
        if (isRunning) {
            stop();
        } else {
            start();
        }
    });
});