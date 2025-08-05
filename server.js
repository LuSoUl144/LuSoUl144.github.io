const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "https://lusoul144.github.io", // 허용할 클라이언트의 주소
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static(__dirname));

let presenterId = null;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 역할 선택
    socket.on('select_role', (role) => {
        if (role === 'presenter') {
            if (presenterId && presenterId !== socket.id) {
                // 이미 다른 발표자가 있으면 거절
                socket.emit('role_assign_failure', '이미 다른 발표자가 있습니다.');
            } else {
                presenterId = socket.id;
                socket.emit('role_assigned', 'presenter');
                console.log(`User ${socket.id} assigned as PRESENTER`);
            }
        } else {
            socket.emit('role_assigned', 'audience');
            console.log(`User ${socket.id} assigned as AUDIENCE`);
        }
    });

    // 발표자로부터 데이터 수신 및 관객에게 전송
    socket.on('sensor_data', (data) => {
        if (socket.id === presenterId) {
            // 보낸 사람이 발표자일 경우에만 모든 관객에게 데이터 전송
            socket.broadcast.emit('graph_update', data);
        }
    });

    // 차트 초기화 신호 수신 및 전파
    socket.on('clear_chart', () => {
        if (socket.id === presenterId) {
            socket.broadcast.emit('clear_chart');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.id === presenterId) {
            presenterId = null; // 발표자가 나가면 초기화
            console.log('Presenter has disconnected. No active presenter.');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
