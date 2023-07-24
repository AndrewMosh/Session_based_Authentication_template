const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");

// Подключаемся к базе данных MongoDB
mongoose.connect("mongodb://localhost/authentication", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const app = express();

// Заводим сессию и хранилище для сессий в базе данных
const sessionStore = MongoStore.create({
  mongoUrl: "mongodb://localhost/authentication",
  collectionName: "sessions",
});

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
  })
);

// Модель пользователя
const User = mongoose.model("User", {
  username: String,
  password: String,
});

// Регистрация пользователя
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      // Пользователь с таким именем уже существует
      return res.status(400).send("Username already exists");
    }

    const user = new User({ username, password });
    await user.save();

    // Устанавливаем ID пользователя в сессию
    req.session.userId = user._id;

    res.send("Registration successful");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Вход пользователя
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user || user.password !== password) {
      // Неверное имя пользователя или пароль
      return res.status(401).send("Invalid username or password");
    }

    // Устанавливаем ID пользователя в сессию
    req.session.userId = user._id;

    res.send("Login successful");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Защищенный маршрут для проверки аутентификации
app.get("/protected", (req, res) => {
  if (!req.session.userId) {
    // Пользователь не аутентифицирован
    return res.status(401).send("Unauthorized");
  }

  // Получаем информацию о текущем пользователе, например по его ID
  User.findById(req.session.userId, (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Internal Server Error");
    }

    if (!user) {
      // Пользователь не найден
      return res.status(401).send("Unauthorized");
    }

    res.send(`Hello, ${user.username}!`);
  });
});

// Завершение сессии
app.post("/logout", (req, res) => {
  // Очищаем ID пользователя из сессии
  req.session.userId = null;

  res.send("Logout successful");
});

// Запуск сервера
app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
