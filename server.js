const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Fixes DNS resolution on university networks

const express = require('express');
const mongoose = require('mongoose');
const neo4j = require('neo4j-driver');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// --- 1. CONFIGURATION ---
const mongoURI = 'mongodb+srv://admin:123password@assignmentcluster.5hjpyx3.mongodb.net/studentDB?retryWrites=true&w=majority';
const neoURI = 'neo4j+s://5d53dc0d.databases.neo4j.io';
const neoUser = '5d53dc0d';
const neoPass = '8ckF8RBurmEpGE4uFfzb5_jjMb78eUedzHYeiOOiSGA';
const driver = neo4j.driver(neoURI, neo4j.auth.basic(neoUser, neoPass));

// --- 2. MODELS & DRIVERS ---
const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: String,
    skill: String
}));



// --- 3. DATABASE CONNECTION BRIDGE ---
async function connectDatabases() {
    try {
        await mongoose.connect(mongoURI);
        console.log("✅ MongoDB Atlas: Connected");
        
        await driver.verifyConnectivity();
        console.log("✅ Neo4j Aura: Connected");
    } catch (err) {
        console.log("❌ Connection Error:", err.message);
    }
}
connectDatabases();

// --- 4. API ROUTE ---
app.post('/register', async (req, res) => {
    const { name, email, skill } = req.body;
    const session = driver.session();

    try {
        // Save to MongoDB (Document)
        const newUser = new User({ name, email, skill });
        await newUser.save();

        // Save to Neo4j (Graph)
        await session.run(
            `MERGE (u:Student {name: $name, email: $email}) 
             MERGE (s:Skill {name: $skill}) 
             MERGE (u)-[:HAS_SKILL]->(s)`,
            { name, email, skill }
        );

        res.status(200).send(`Student ${name} successfully synced to both databases.`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error saving to cloud databases.");
    } finally {
        await session.close();
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));