import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "book-library",
  password: "yourPassword",
  port: 5432,
});
db.connect();

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  const sort = req.query.sort || "rating";
  try {
    const result = await db.query(`SELECT * FROM books ORDER BY ${sort} DESC`);
    res.render("index", { books: result.rows, sort });
  } catch (error) {
    console.log(error.response.data);
    res.status(500);
  }
});

app.get("/books/add", (req, res) => {
  res.render("add");
});

app.post("/books", async (req, res) => {
  const { title, author, rating, review } = req.body;
  try {
    const searchResponse = await axios.get("https://openlibrary.org/search.json", {
      params: { title, author, limit: 1 },
    });

    let coverUrl = null;

    if (searchResponse.data.docs && searchResponse.data.docs.length > 0) {
      const bookData = searchResponse.data.docs[0];
      if (bookData.cover_edition_key) {
        coverUrl = `https://covers.openlibrary.org/b/olid/${bookData.cover_edition_key}-L.jpg`;
      }
    }

    await db.query(
      "INSERT INTO books (title, author, rating, review, cover_url) VALUES ($1, $2, $3, $4, $5)",
      [title, author, rating, review, coverUrl]
    );

    res.redirect("/");
  } catch (error) {
    console.log(error.response.data);
    res.status(500);
  }
});

app.get("/books/:id/edit", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).send("Nie znaleziono książki");
    }
    res.render("edit", { book: result.rows[0] });
  } catch (error) {
    console.log(error.response.data);
    res.status(500);
  }
});

app.post("/books/:id", async (req, res) => {
  const { id } = req.params;
  const { review } = req.body;
  try {
    await db.query("UPDATE books SET review = $1 WHERE id = $2", [review, id]);
    res.redirect("/");
  } catch (error) {
    console.log(error.response.data);
    res.status(500);
  }
});

app.post("/books/:id/delete", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM books WHERE id = $1", [id]);
    res.redirect("/");
  } catch (error) {
    console.log(error.response.data);
    res.status(500);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
