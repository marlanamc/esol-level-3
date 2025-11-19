# 🚀 How to Update Your Netlify Site

## Option 1: Connect to GitHub (Recommended - Auto Updates!)

### Step 1: Create GitHub Repository
1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon → **New repository**
3. Name it something like `marlie-esol-activities`
4. Choose **Public** or **Private** (your choice)
5. **Don't** initialize with README (we already have files)
6. Click **Create repository**

### Step 2: Push Your Code to GitHub
Run these commands in your terminal (you're already in the right folder):

```bash
git add .
git commit -m "Initial commit - ESOL activities"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

*(Replace YOUR-USERNAME and YOUR-REPO-NAME with your actual GitHub username and repo name)*

### Step 3: Connect Netlify to GitHub
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Click **Deploy with GitHub**
4. Authorize Netlify to access your GitHub
5. Select your repository (`marlie-esol-activities`)
6. Netlify will auto-detect settings (keep defaults)
7. Click **Deploy site**

### Step 4: Future Updates (Super Easy!)
Now whenever you update files:
```bash
git add .
git commit -m "Updated activities"
git push
```

Netlify will **automatically** rebuild and deploy your site! 🎉

---

## Option 2: Manual Updates (Netlify Drop)

If you prefer to keep using drag-and-drop:
1. Make your changes locally
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag and drop your **entire folder** again
4. Netlify will create a new deployment URL

**Note:** This method creates a new URL each time, so you'll need to share the new link with students.

---

## Option 3: Netlify CLI (For Advanced Users)

If you install the Netlify CLI, you can deploy updates with one command:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

This requires a bit more setup but is great for quick updates.

---

## 💡 Recommendation

**Use Option 1 (GitHub)** - It's the smoothest workflow and your site will always be at the same URL!

