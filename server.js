const mysql = require('mysql');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;

const dbConnection = mysql.createConnection({
  host: 'localhost', // Замените на адрес вашей базы данных
  user: 'root', // Замените на ваше имя пользователя
  password: 'root', // Замените на ваш пароль
  database: 'navigator' // Замените на имя вашей базы данных
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.use(cors());
app.use(express.json());

app.post('/command', (req, res) => {

  const command = req.body.command;

  handleCommand(command);

  res.send('OK');

});

function handleCommand(command) {

  if (command === 'minimize_wpf') {
    sendMinimizeWpfCommand(); 
  }

}

function sendMinimizeWpfCommand() {

  // код для вызова API WPF приложения

}

app.get('/notify', (req, res) => {

  // Отправка события всем подключенным сокетам
  io.emit('test-completed', {
    message: 'Тест завершен' 
  });
  
  res.send('Уведомление отправлено');
});

// Подключение к базе данных
dbConnection.connect((err) => {
  if (err) {
      console.error('Ошибка подключения к базе данных:', err);
      return;
  }
  console.log('Успешное подключение к базе данных');
});

// Обработчик POST запроса для сохранения UID в базе данных
app.post('/saveUid', (req, res) => {
  const uid = req.body.uid;

  const checkSql = 'SELECT COUNT(*) AS count FROM uid WHERE uidcol = ?';

  dbConnection.query(checkSql, [uid], (err, result) => {
    if (err) {
      console.error('Ошибка при выполнении SQL запроса:', err);
      res.status(500).send('Ошибка сервера');
    } else {
      const count = result[0].count;

      if (count === 0) {
        const insertSql = 'INSERT INTO uid (uidcol) VALUES (?)';
        dbConnection.query(insertSql, [uid], (err, result) => {
          if (err) {
            console.error('Ошибка при выполнении SQL запроса:', err);
            res.status(500).send('Ошибка сервера');
          } else {
            console.log('UID успешно сохранен в базе данных');
            res.status(200).send('UID успешно сохранен');
          }
        });
      } else {
        console.log('UID уже существует в базе данных');
        res.status(200).send('UID уже существует');
      }
    }
  });
});

// Обработчик POST-запроса для авторизации по UID
app.post('/uidLogin', (req, res) => {
  const { uid } = req.body;

  // Проверяем, что передан uid
  if (!uid) {
    return res.status(400).json({ message: 'Введите номер UID' });
  }

  dbConnection.query('SELECT * FROM uid WHERE uidcol = ?', [uid], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Ошибка сервера' });
    }

    // Проверяем, были ли найдены результаты
    if (results.length === 0) {
      return res.status(401).json({ message: 'Неверный UID' }); // Возвращаем статус "Unauthorized"
    }

    io.emit('uid-authorized', {});
    // В данном случае UID считается верным, поэтому возвращаем успешный статус
    return res.status(200).json({ message: 'Успешная авторизация' });
  });
});


io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('time-received', (timeInSeconds) => {
    console.log('Received time:', timeInSeconds);
    io.emit('time-received', timeInSeconds);
  });

  socket.on('timer-finished', () => {
    console.log('Timer finished');
    io.emit('timer-finished');
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
