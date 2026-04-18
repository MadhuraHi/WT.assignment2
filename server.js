// Add a MongoDB Schema
const userSchema = new mongoose.Schema({
    name: String,
    role: String,
    skill: String,
    registeredAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// REGISTRATION ROUTE
app.post('/api/register', async (req, res) => {
    const { name, role, skill } = req.body;
    const session = driver.session();

    try {
        // 1. Save to MongoDB (Profile Data)
        const newUser = new User({ name, role, skill });
        await newUser.save();

        // 2. Save to Neo4j (Graph Data)
        await session.run(
            `MERGE (u:Entity {name: $name, type: $role})
             MERGE (s:Skill {name: $skill})
             MERGE (u)-[:HAS_SKILL]->(s)
             RETURN u`,
            { name, role, skill: skill.toUpperCase() }
        );

        res.status(201).send("Registration Successful");
    } catch (err) {
        console.error(err);
        res.status(500).send("System Error");
    } finally {
        await session.close();
    }
});