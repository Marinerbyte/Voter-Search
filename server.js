// server.js

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS voters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bhag_number INTEGER NOT NULL,
            anukraman_number INTEGER,
            ghar_number TEXT,
            matdar_name TEXT NOT NULL,
            sambandh TEXT,
            sambandhi_name TEXT,
            jati TEXT,
            umar INTEGER,
            epic_number TEXT,
            raw_line TEXT
        )`, (createErr) => {
            if (createErr) {
                console.error('Error creating voters table:', createErr.message);
            } else {
                console.log('Voters table created or already exists.');
            }
        });
    }
});

// Multer storage for file uploads (memoryStorage, as files are temporary)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Import the parsing function
const { parseVoterData } = require('./parseData'); // <--- Dhyaan dein yahan!

// Basic Route
app.get('/', (req, res) => {
    res.send('Welcome to the Election Data Search Backend! Database connected and table checked.');
});

// --- Data Upload Route ---
app.post('/upload-data', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    if (!req.body.bhag_number) {
        return res.status(400).send('Bhag Number is required.');
    }

    const bhagNumber = parseInt(req.body.bhag_number);
    if (isNaN(bhagNumber) || bhagNumber <= 0) {
        return res.status(400).send('Invalid Bhag Number provided.');
    }

    try {
        const fileContent = req.file.buffer.toString('utf8');
        const voters = parseVoterData(fileContent, bhagNumber);

        if (voters.length === 0) {
            return res.status(400).send('No valid voter data found in the file.');
        }

        // Batch insert into database
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");
            const stmt = db.prepare(`INSERT INTO voters (
                bhag_number, anukraman_number, ghar_number, matdar_name, 
                sambandh, sambandhi_name, jati, umar, epic_number, raw_line
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            voters.forEach(voter => {
                stmt.run(
                    voter.bhag_number,
                    voter.anukraman_number,
                    voter.ghar_number,
                    voter.matdar_name,
                    voter.sambandh,
                    voter.sambandhi_name,
                    voter.jati,
                    voter.umar,
                    voter.epic_number,
                    voter.raw_line
                );
            });

            stmt.finalize();
            db.run("COMMIT;", (err) => {
                if (err) {
                    console.error("Transaction commit failed:", err.message);
                    return res.status(500).send('Error saving data to database.');
                }
                res.status(200).send(`Successfully uploaded and parsed ${voters.length} voter entries for Bhag Number ${bhagNumber}.`);
            });
        });

    } catch (error) {
        console.error('Error processing file upload:', error);
        res.status(500).send('Error processing file.');
    }
});

// --- Search Route ---
app.get('/search-voters', (req, res) => {
    const query = req.query.query ? req.query.query.trim() : '';
    const bhag = req.query.bhag ? parseInt(req.query.bhag) : null;

    let sql = `SELECT * FROM voters WHERE matdar_name LIKE ? OR sambandhi_name LIKE ?`;
    let params = [`%${query}%`, `%${query}%`];

    if (bhag && !isNaN(bhag)) {
        sql += ` AND bhag_number = ?`;
        params.push(bhag);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error fetching search results:', err.message);
            return res.status(500).json({ error: 'Database search failed.' });
        }
        res.status(200).json(rows);
    });
});


// Server ko start karna
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Jab server band ho, tab database connection close karna
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
    });
    process.exit(0);
});
