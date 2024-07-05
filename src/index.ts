import express, {Request, Response} from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios-typescript";

interface Book {
    id: number,
    title: string,
    author: string,
    review: string,
    review_date: string,
    rating: number,
    isbn: number
}

interface Comments {
    id: number,
    comment: string,
    short: string
}

interface CommentReplies {
    id: number,
    reply: string,
    comment_id: number
}

const app = express();
const port = 3000;
var title: string = "Add a book 📚.";
let books: Book[] = [];
let editReview = [];
var placeholder: string = "Leave a comment..."
let comments: Comments[] = [];
let commentOfOnePerson: Comments[] = [];
let commentReplies: CommentReplies[] = [];

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "books",
  password: "this is a secret.",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

var request = await db.query("SELECT * FROM book_detail ORDER BY id ASC");

app.get("/", async (req: Request, res: Response) => {
    try {
        const result: Book[] = request.rows;
        books = [];
        result.forEach((book: Book) => {
            books.push(book);
        });
        // console.log(books);
        res.render("index.ejs", {
            books: books,
        });
    } catch (err) {
        console.error("Error quering database: ", err);
        res.redirect("/");
    }
});

app.get("/index.ejs", (req: Request, res: Response) => {
    res.redirect("/");
});

app.get("/title", async (req: Request, res: Response) => {
    request = await db.query("SELECT * FROM book_detail ORDER BY title ASC");
    res.redirect("/");
});

app.get("/newest", async (req: Request, res: Response) => {
    request = await db.query("SELECT * FROM book_detail ORDER BY id DESC");
    res.redirect("/");
});

app.get("/best", async (req: Request, res: Response) => {
    request = await db.query("SELECT * FROM book_detail ORDER BY rating DESC");
    res.redirect("/");
});

app.get("/about.ejs", (req: Request, res: Response) => {
    res.render("about.ejs");
});

app.get("/owner.ejs", (req: Request, res: Response) => {
    res.render("owner.ejs");
});

app.get("/contact.ejs", (req: Request, res: Response) => {
    res.render("contact.ejs");
});

app.get("/comments.ejs", async (req: Request, res: Response) => {
    try {
        comments = [];
        const result = await db.query("SELECT * FROM comments");
        const commentsFromDb: Comments[] = result.rows;
        commentsFromDb.forEach((comment: Comments) => {
            comments.push(comment);
        });
    res.render("comments.ejs", {
        placeholder: placeholder,
        comments: comments
    });
} catch (err) {
    console.error("Error: ", err);
}
});

app.post("/comment1.ejs", async (req: Request, res: Response) => {
    const commentId: number = req.body.commentPageBtn;
    try {
        const result1 = await db.query("SELECT * FROM comments WHERE id = $1", [commentId]);
        const data: Comments[] = result1.rows;
        const result2 = await db.query("SELECT * FROM comment_replies JOIN comments ON comments.id = comment_id WHERE comment_id = $1", [commentId]);
        const replies: CommentReplies[] = result2.rows;
        commentOfOnePerson = [];
        commentReplies = [];
        replies.forEach((reply: CommentReplies) => {
            commentReplies.push(reply);
        })
        data.forEach((comment: Comments) => {
            commentOfOnePerson.push(comment);
        })
        res.render("comment1.ejs", {
            comments: commentOfOnePerson,
            commentReplies: commentReplies
        });
    } catch (err) {
        console.error("Error: ", err);
    }
});

app.post("/reply", async (req: Request, res: Response) => {
    const reply: string = req.body.reply;
    const commentId: number = req.body.addReplyBtn;
    try {
        await db.query("INSERT INTO comment_replies (reply, comment_id) VALUES ($1, $2)", [reply, commentId]);
        res.redirect("/comments.ejs");
    } catch (err) {
        console.error("Error: ", err);
    }
});

app.get("/add.ejs", (req: Request, res: Response) => {
    res.render("add.ejs", {title: title});
});

app.post("/edit", async (req: Request, res: Response) => {
    const editBtnId: number = req.body.editBtn;
    try {
    const result = await db.query("SELECT * FROM book_detail WHERE id = $1", [editBtnId]);    
    res.render("edit.ejs", {
        edits: result.rows[0]
    });
  } catch (err) {
    console.error("Error quering database: ", err);
  }
});

app.post("/update", async (req: Request, res: Response) => {
    const editBtnId: number = req.body.updateBtn;
    const editedReview: string = req.body.editedReview;
    try {
    await db.query("UPDATE book_detail SET review = $1 WHERE id = $2", [editedReview, editBtnId]);
    // console.log(editedReview);
    res.redirect("/");
    } catch (err) {
        console.error("Error quering database: ", err)
    }
});

app.post("/delete", async (req: Request, res: Response) => {
    try {
    const deleteBtnId: number = req.body.deleteBtn;
    await db.query("DELETE FROM book_detail WHERE id = $1", [deleteBtnId]);
    res.redirect("/");
    } catch (err) {
        console.error("Error quering database: ", err);
    }
});

app.post("/comment", async (req: Request, res: Response) => {
    const comment: string = req.body.comment;
    var commentShort: string = "";
    // console.log(commentShort, comment)
    try {
        if (comment.length > 20) {
            commentShort = comment.slice(0, 30) + "...";
            await db.query("INSERT INTO comments (comment, short) VALUES ($1, $2)", [comment, commentShort]);
            res.redirect("/comments.ejs")
        } else if(comment.length < 20) {
            placeholder = "Enter at least 25 characters."
            res.redirect("/comments.ejs")
        }
    } catch (err) {
        console.error("Error quering database: ", err);
    }
});

app.post("/addbook", async (req: Request, res: Response) => {
    const inputIsbn: string = req.body.isbn;
    const inputReview: string = req.body.review;
    const nonNumericPattern: RegExp = /\D/;
    const rating: number = req.body.rating;
    try {        
        const request1 = await axios.get(`https://openlibrary.org/isbn/${inputIsbn}.json`);
        const response1: any = request1.data;
        const authorKey: any = response1.authors[0].key;
        const request2 = await axios.get(`https://openlibrary.org/${authorKey}.json`)
        const bookTitle: string = response1.title;
        const isbn: number = parseInt(response1.isbn_13);
        const authorName: string = request2.data.name;
        const now: Date = new Date();
        const date: string = now.toDateString();
        await db.query("INSERT INTO book_detail (title, author, review, review_date, rating, isbn) VALUES ($1, $2, $3, $4, $5, $6); ", [bookTitle, authorName, inputReview, date, rating, isbn]);
        title = "Add a book 📚."    
        res.redirect("/")
    } catch (err) {
        console.error("Error:", err);
        if(nonNumericPattern.test(inputIsbn)) {
            title = "ISBN format is invalid";
        } else {
        title = "No book that match your criteria."
        }
        res.redirect("/add.ejs");
    }
});

app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
})