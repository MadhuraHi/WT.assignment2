const express = require('express');
const mongoose = require('mongoose');
const neo4j = require('neo4j-driver');
const path = require('path');

const app = express();
app.use(express.json());

// --- DATABASE CONFIGURATIONS ---

// 1. MongoDB Atlas Connection
const mongoURI = 'mongodb://admin:123password@ac-assignmentcluster-shard-00-00.5hjpyx3.mongodb.net:27017,ac-assignmentcluster-shard-00-01.5hjpyx3.mongodb.net:27017,ac-assignmentcluster-shard-00-02.5hjpyx3.mongodb.net:27017/studentDB?ssl=true&replicaSet=atlas-13vxyz-shard-0&authSource=admin&retryWrites=true&w=majority';
mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Atlas: Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// 2. Neo4j Aura Connection
const neoURI = 'neo4j+s://5d53dc0d.databases.neo4j.io';
const neoUser = '5d53dc0d';
const neoPass = '8ckF8RBurmEpGE4uFfzb5_jjMb78eUedzHYeiOOiSGA';

const driver = neo4j.driver(neoURI, neo4j.auth.basic(neoUser, neoPass));

const checkNeo4j = async () => {
    try {
        await driver.verifyConnectivity();
        console.log('✅ Neo4j Aura: Connected');
    } catch (err) {
        console.error('❌ Neo4j Error:', err);
    }
};
checkNeo4j();

// --- API ROUTES ---

// Fetch Professors & Skills from Neo4j
app.get('/api/professors', async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (p:Professor)-[:EXPERTISE_IN]->(s:Skill)
             RETURN p.name AS name, p.title AS title, collect(s.name) AS skills`
        );
        const professors = result.records.map(record => ({
            name: record.get('name'),
            title: record.get('title'),
            skills: record.get('skills')
        }));
        res.json(professors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// Create Connection (Relationship)
app.post('/api/connect', async (req, res) => {
    const { studentName, profName } = req.body;
    const session = driver.session();
    try {
        await session.run(
            `MATCH (s:Student {name: $studentName}), (p:Professor {name: $profName})
             MERGE (s)-[r:CONNECTED_TO]->(p)
             SET r.timestamp = timestamp()
             RETURN r`,
            { studentName, profName }
        );
        res.send(`Connection established with ${profName}`);
    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        await session.close();
    }
});

// Serve the Frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});