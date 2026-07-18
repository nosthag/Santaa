<p align="center">
  <img width="131" height="39" alt="Santaa Bot Logo" src="https://github.com/user-attachments/assets/d533171f-e22c-4299-9028-694df3387124" />
</p>

<p align="center">
  <strong>A lightweight, lightning-fast Discord bot built for easy customization using 100% Javascript</strong>
</p>

<p align="center">
  <a href="#PREREQUISITES">PREREQUISITES</a> ·
  <a href="#SETUP">SETUP</a> ·
  <a href="docs/CHANGELOG.md">CHANGELOG</a> ·
  <a href="docs/ISSUES.md">KNOWN ISSUES</a>
</p>

---

## PREREQUISITES

Before do anything:

1. **Node.js** (recommend v16 or higher)
2. **Discord Bot Token**
3. **Your Discord User ID** (for owner commands, so you can flex on everyone)

> **Note on Databases:**  
> I used SQLite cuz Im lazy and MongoDB setup sounded like a side quest. You can swap to Mongo if you're built different

## SETUP

Run these commands in your terminal:

```bash
git clone https://github.com/meh2025/Santaa.git
cd Santaa
npm install
```
Now go fix that .env file (it's currently exampleenv.txt):
```
# Linux / MacOS
cp exampleenv.txt .env

# Windows (the struggle is real)
copy exampleenv.txt .env
```
Open .env and put in your full information.
Also, create a folder called bosses_memory inside database/ for the PVP AI Bosses. it's mandatory (Gonna fix it in v1.1.1 STABLE)

Finally, We only have single way to run this bot:
```
npm run dev    # for development
npm run start  # daily driver mode
npm run test   # test if it's bugging or not
```

---
thx for read ts, have a gut day bradar
