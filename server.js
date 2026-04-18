const express = require('express');
const mongoose = require('mongoose');
const neo4j = require('neo4j-driver');
const path = require('path');

const app = express();
app.use(express.json());

// --- CONFIGURATIONS ---

const mongoURI = 'mongodb+srv://admin:123password@assignmentcluster.5hjpyx3.mongodb.net/studentDB?retryWrites=true&w=majority';
const neoURI = 'neo4j+s://5d53dc0d.databases.neo4j.io';
const neoUser = '5d53dc0d';
const neoPass = '8ckF8RBurmEpGE4uFfzb5_jjMb78eUedzHYeiOOiSGA';

// --- DB CONNECTIONS ---

mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB Atlas: Connected'))
    .catch(err => console.error('❌ MongoDB Error:', err));

const driver = neo4j.driver(neoURI, neo4j.auth.basic(neoUser, neoPass));

const initNeo = async () => {
    try {
        await driver.verifyConnectivity();
        console.log('✅ Neo4j Aura: Connected');
    } catch (err) {
        console.error('❌ Neo4j Error:', err);
    }
};
initNeo();

// --- API ROUTES ---

// 1. Get Entities and their associated Skills
app.get('/api/entities', async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.run(
            `MATCH (e:Entity)-[:HAS_SKILL]->(s:Skill)
             RETURN e.name AS name, e.type AS title, collect(s.name) AS skills`
        );
        const entities = result.records.map(record => ({
            name: record.get('name'),
            title: record.get('title'),
            skills: record.get('skills')
        }));
        res.json(entities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// 2. Establish Relationship Link
app.post('/api/connect', async (req, res) => {
    const { userName, targetName } = req.body;
    const session = driver.session();
    try {
        await session.run(
            `MATCH (u:User {name: $userName}), (e:Entity {name: $targetName})
             MERGE (u)-[r:LINKED_TO]->(e)
             SET r.active = true
             RETURN r`,
            { userName, targetName }
        );
        res.send(`Link verified with ${targetName}`);
    } catch (err) {
        res.status(500).send(err.message);
    } finally {
        await session.close();
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- INIT ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 System Online: Port ${PORT}`);
});