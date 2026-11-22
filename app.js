'use strict';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const slugify = require('slugify');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const app = express();
const PORT = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) throw new Error('Set a random SESSION_SECRET (32+ characters) in production.');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'public', 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true }); fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'neighbourhood.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS vendors (
 id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, owner_name TEXT NOT NULL DEFAULT '', email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Food', tagline TEXT DEFAULT '', description TEXT DEFAULT '', hero_title TEXT DEFAULT '', hero_subtitle TEXT DEFAULT '', hero_description TEXT DEFAULT '',
 greeting TEXT DEFAULT 'Namaskar!', story_intro TEXT DEFAULT '', story_body TEXT DEFAULT '', story_feedback TEXT DEFAULT '', location_intro TEXT DEFAULT '', address TEXT DEFAULT '', hours TEXT DEFAULT '', phone_display TEXT DEFAULT '', phone_href TEXT DEFAULT '', maps_url TEXT DEFAULT '', zomato_url TEXT DEFAULT '', swiggy_url TEXT DEFAULT '', footer_line TEXT DEFAULT '', logo_letter TEXT DEFAULT 'V', active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS menu_items (id INTEGER PRIMARY KEY, vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT DEFAULT '', price TEXT DEFAULT '', label TEXT DEFAULT 'MADE FRESH', image_url TEXT DEFAULT '', sort_order INTEGER DEFAULT 0, available INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS feedback (
 id INTEGER PRIMARY KEY, vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE, customer_name TEXT DEFAULT '', visit_date TEXT DEFAULT '', visit_type TEXT DEFAULT '', ordered_json TEXT DEFAULT '[]', rating INTEGER NOT NULL, rated_dish TEXT DEFAULT '', answers_json TEXT NOT NULL DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// First-run bootstrap: always ensure the two supplied demo vendors exist.
// This removes the separate/manual seed step that previously left the directory empty.
function ensureStarterVendors() {
  const insertVendor = db.prepare(`INSERT INTO vendors
    (slug,name,owner_name,email,password_hash,category,tagline,description,hero_title,hero_subtitle,hero_description,greeting,story_intro,story_body,story_feedback,location_intro,address,hours,phone_display,phone_href,maps_url,zomato_url,swiggy_url,footer_line,logo_letter)
    VALUES (@slug,@name,@owner_name,@email,@password_hash,@category,@tagline,@description,@hero_title,@hero_subtitle,@hero_description,@greeting,@story_intro,@story_body,@story_feedback,@location_intro,@address,@hours,@phone_display,@phone_href,@maps_url,@zomato_url,@swiggy_url,@footer_line,@logo_letter)`);
  const starterPasswordHash = () => bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 12);
  const rameshSlug = 'ramesh-naik-street-kitchen';
  let ramesh = db.prepare('SELECT id FROM vendors WHERE slug=?').get(rameshSlug);
  if (!ramesh) {
    const id = insertVendor.run({slug:rameshSlug,name:"Ramesh's Street Kitchen",owner_name:'Ramesh Naik',email:'ramesh@neighbourhood.local',password_hash:starterPasswordHash(),category:'Street food',tagline:'YOUR NEIGHBOURHOOD FOOD STOP',description:'From buttery pav bhaji to freshly made rolls, enjoy simple street-food favourites prepared fresh and served with care.',hero_title:'Good food.',hero_subtitle:'Good mood.',hero_description:'From buttery pav bhaji to freshly made rolls, enjoy simple street-food favourites prepared fresh and served with care.',greeting:'Namaskar!',story_intro:"I'm Ramesh Naik. I've been running my little street-food stall in Goa for the past 8 years, right where students and neighbours stop by for a bite after a long day.",story_body:'I pick the ingredients, cook every order and serve you myself, because I want each plate to be fresh and every customer to feel welcome. Whether you are here for a quick snack or a chat over chai, I am happy to see you.',story_feedback:'I am always trying to get better, so please tell me what you liked and what I can improve in the feedback section below.',location_intro:'Find me at BITS Goa, near the college and the residential area. Come hungry, leave happy.',address:"BITS Goa, D'Spine, Goa, India",hours:'Every day, 4 PM till midnight',phone_display:'+91 82619 67763',phone_href:'tel:+918261967763',maps_url:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent("BITS Goa, D'Spine, Goa, India"),zomato_url:'https://www.zomato.com/goa',swiggy_url:'https://www.swiggy.com/',footer_line:'Fresh food, familiar flavours, right here in Goa.',logo_letter:'R'}).lastInsertRowid;
    ramesh = {id};
  }
  const menuCount = db.prepare('SELECT COUNT(*) AS c FROM menu_items WHERE vendor_id=?').get(ramesh.id).c;
  if (!menuCount) {
    const add = db.prepare('INSERT INTO menu_items(vendor_id,name,description,price,label,image_url,sort_order) VALUES(?,?,?,?,?,?,?)');
    const menu = [
      ['Sandwiches','Toasted and satisfying, prepared when you order.','60','QUICK BITE','/assets/sandwiches.jpg'],
      ['Rolls','A filling, flavour-packed roll for a quick bite.','80','MADE FRESH','/assets/rolls.jpg'],
      ['Pav Bhaji','Spiced vegetable mash served with soft, buttery pav.','90','HOUSE FAVOURITE','/assets/pav-bhaji.jpg'],
      ['Patties','Golden, flaky and perfect with a cup of chai.','30','CRISPY & FLAKY','/assets/patties.jpg'],
      ['Choris Pav','A Goan favourite tucked into soft, fresh pav.','70','GOAN STYLE','/assets/choris-pav.jpg'],
      ['Tea','A warm cup in a clay kulhad to go with your snack.','20','CHAI BREAK','/assets/chai.jpg']
    ];
    menu.forEach((m,i)=>add.run(ramesh.id,...m,i));
  }
  const prakashSlug = 'prakashs-food-stall';
  if (!db.prepare('SELECT id FROM vendors WHERE slug=?').get(prakashSlug)) {
    insertVendor.run({slug:prakashSlug,name:"Prakash's Food Stall",owner_name:'Prakash',email:'prakash@neighbourhood.local',password_hash:starterPasswordHash(),category:'Food',tagline:'A LOCAL FOOD STORY',description:'Prakash is getting his stall page ready. Menu, photos and stall details will be added by the vendor.',hero_title:'Food made',hero_subtitle:'with heart.',hero_description:'A local food story is taking shape. Check back soon for the menu and details.',greeting:'Namaskar!',story_intro:'Welcome to my stall. I am getting my story ready to share with you.',story_body:'I will add more about the food I make, the ingredients I use and what makes this stall special.',story_feedback:'Once the page is ready, I would love to hear what you think.',location_intro:'Location details will be added soon.',address:'Location to be confirmed',hours:'To be confirmed',phone_display:'Contact details coming soon',phone_href:'',maps_url:'',zomato_url:'',swiggy_url:'',footer_line:'A local food story, coming soon.',logo_letter:'P'});
  }
}
ensureStarterVendors();

app.set('view engine', 'ejs'); app.set('views', path.join(ROOT, 'views'));
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:', 'https:'], connectSrc: ["'self'"] } } }));
app.use(express.urlencoded({ extended: true, limit: '1mb' })); app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(ROOT, 'public')));
app.use(session({ store: new SQLiteStore({ db: 'sessions.sqlite', dir: DATA_DIR }), secret: process.env.SESSION_SECRET || 'change-this-session-secret-before-deploying-please', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 8 } }));
app.use((req, res, next) => { if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex'); res.locals.csrf = req.session.csrf; res.locals.user = req.session.user || null; next(); });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false, message: 'Too many attempts. Please wait and try again.' });
const upload = multer({ storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${path.extname(file.originalname).toLowerCase()}`) }), limits: { fileSize: 3 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)) });

function csrf(req, res, next) { if (req.body._csrf !== req.session.csrf) return res.status(403).send('Security token expired. Go back, refresh and try again.'); next(); }
function requireAdmin(req, res, next) { if (req.session.user?.role !== 'admin') return res.redirect('/admin/login'); next(); }
function requireVendor(req, res, next) { if (req.session.user?.role !== 'vendor') return res.redirect('/vendor/login'); next(); }
function getVendor(id) { return db.prepare('SELECT * FROM vendors WHERE id=?').get(id); }
function menuFor(id, includeUnavailable=false) { return db.prepare(`SELECT * FROM menu_items WHERE vendor_id=? ${includeUnavailable?'':'AND available=1'} ORDER BY sort_order,id`).all(id); }
function slugFor(name) { return slugify(name, { lower: true, strict: true }) || 'vendor'; }
function uniqueSlug(name) { const base=slugFor(name); let slug=base, i=2; while(db.prepare('SELECT id FROM vendors WHERE slug=?').get(slug)) slug=`${base}-${i++}`; return slug; }
function safeReturn(req, fallback) { const r=req.body.returnTo; return r && r.startsWith('/') && !r.startsWith('//') ? r : fallback; }
function averageRating(id) { return db.prepare('SELECT ROUND(AVG(rating),1) AS avg, COUNT(*) AS count FROM feedback WHERE vendor_id=?').get(id); }
function publicVendor(v) { return { ...v, menu: menuFor(v.id) }; }
function allPublicVendors(excludeId) { return db.prepare('SELECT id,slug,name,owner_name,category,tagline FROM vendors WHERE active=1 AND id<>? ORDER BY name LIMIT 6').all(excludeId); }
function renderVendor(req,res,v) { const items=menuFor(v.id); const other=allPublicVendors(v.id); const rating=averageRating(v.id); res.render('vendor',{vendor:v,menuItems:items,otherVendors:other,rating}); }
function setFlash(req, msg) { req.session.flash=msg; }
app.use((req,res,next)=>{res.locals.flash=req.session.flash||null;delete req.session.flash;next();});

// One-time admin bootstrap. This route disappears once the first admin exists.
app.get('/setup', (req,res)=>{ if(db.prepare('SELECT COUNT(*) c FROM admins').get().c) return res.redirect('/admin/login'); res.render('setup'); });
app.post('/setup', authLimiter, csrf, async (req,res)=>{ if(db.prepare('SELECT COUNT(*) c FROM admins').get().c) return res.redirect('/admin/login'); const {name,email,password}=req.body; if(!name||!email||!password||password.length<10) return res.status(400).render('setup',{error:'Enter your name, a valid email and a password of at least 10 characters.'}); const hash=await bcrypt.hash(password,12); db.prepare('INSERT INTO admins(name,email,password_hash) VALUES(?,?,?)').run(name.trim(),email.trim().toLowerCase(),hash); setFlash(req,'Admin account created. You can now sign in.'); res.redirect('/admin/login'); });

app.get('/', (req,res)=>{ const vendors=db.prepare('SELECT v.*, (SELECT COUNT(*) FROM menu_items m WHERE m.vendor_id=v.id AND m.available=1) AS menu_count, (SELECT ROUND(AVG(f.rating),1) FROM feedback f WHERE f.vendor_id=v.id) AS avg_rating, (SELECT COUNT(*) FROM feedback f WHERE f.vendor_id=v.id) AS review_count FROM vendors v WHERE active=1 ORDER BY v.created_at DESC').all(); res.render('home',{vendors}); });
app.get('/v/:slug', (req,res)=>{ const v=db.prepare('SELECT * FROM vendors WHERE slug=? AND active=1').get(req.params.slug); if(!v)return res.status(404).render('not-found'); renderVendor(req,res,v); });

// Customer feedback: complete vendor-specific questionnaire is stored in SQLite.
const feedbackLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
app.post('/v/:slug/feedback', feedbackLimiter, (req,res)=>{
 const v=db.prepare('SELECT id FROM vendors WHERE slug=? AND active=1').get(req.params.slug); if(!v)return res.status(404).json({error:'Vendor not found'});
 const b=req.body; const rating=Number(b.rating); const ordered=Array.isArray(b.ordered)?b.ordered:(b.ordered?[b.ordered]:[]);
 if(![1,2,3,4,5].includes(rating)||!b.visit_type||!ordered.length) return res.status(400).json({error:'Please select visit type, dishes ordered and an overall rating.'});
 const known=['name','visit_date','visit_type','rated_dish','taste','freshness','temperature','portion','value','behaviour','wait_time','order_correct','cleanliness','hygiene','liked_most','could_improve','continue_doing','improve_first','suggestions'];
 const answers={}; for(const k of known) if(b[k]!==undefined) answers[k]=String(b[k]).slice(0,2000);
 db.prepare('INSERT INTO feedback(vendor_id,customer_name,visit_date,visit_type,ordered_json,rating,rated_dish,answers_json) VALUES(?,?,?,?,?,?,?,?)').run(v.id,String(b.name||'').slice(0,100),String(b.visit_date||'').slice(0,20),String(b.visit_type).slice(0,60),JSON.stringify(ordered.slice(0,20)),rating,String(b.rated_dish||'').slice(0,100),JSON.stringify(answers));
 res.json({ok:true,message:'Thank you. Your feedback has been shared with the vendor.'});
});

// Vendor authentication and portal.
app.get('/vendor/login',(req,res)=>res.render('login',{kind:'vendor'}));
app.post('/vendor/login',authLimiter,csrf,async(req,res)=>{const email=String(req.body.email||'').toLowerCase().trim();const v=db.prepare('SELECT * FROM vendors WHERE email=? AND active=1').get(email);if(!v||!(await bcrypt.compare(String(req.body.password||''),v.password_hash))){setFlash(req,'Email or password is incorrect.');return res.redirect('/vendor/login');}req.session.user={role:'vendor',id:v.id,name:v.owner_name||v.name,email:v.email};res.redirect('/vendor/dashboard');});
app.get('/vendor/logout',(req,res)=>{req.session.destroy(()=>res.redirect('/vendor/login'));});
app.get('/vendor/dashboard',requireVendor,(req,res)=>{const v=getVendor(req.session.user.id);const reviews=db.prepare('SELECT * FROM feedback WHERE vendor_id=? ORDER BY created_at DESC LIMIT 100').all(v.id).map(f=>({...f,ordered:JSON.parse(f.ordered_json||'[]'),answers:JSON.parse(f.answers_json||'{}')}));const stats=averageRating(v.id);res.render('vendor-dashboard',{vendor:v,items:menuFor(v.id,true),reviews,stats});});
app.post('/vendor/profile',requireVendor,csrf,(req,res)=>{const fields=['name','owner_name','category','tagline','description','hero_title','hero_subtitle','hero_description','greeting','story_intro','story_body','story_feedback','location_intro','address','hours','phone_display','phone_href','maps_url','zomato_url','swiggy_url','footer_line'];const sets=fields.map(k=>`${k}=@${k}`).join(',');const data={};for(const k of fields)data[k]=String(req.body[k]||'').trim().slice(0,3000);data.id=req.session.user.id;db.prepare(`UPDATE vendors SET ${sets},updated_at=CURRENT_TIMESTAMP WHERE id=@id`).run(data);setFlash(req,'Your vendor page has been updated.');res.redirect('/vendor/dashboard#profile');});
app.post('/vendor/menu/add',requireVendor,csrf,upload.single('image'),(req,res)=>{const {name,description,price,label}=req.body;if(!String(name||'').trim())return res.redirect('/vendor/dashboard#menu');const count=db.prepare('SELECT COUNT(*) c FROM menu_items WHERE vendor_id=?').get(req.session.user.id).c;const image_url=req.file?'/uploads/'+req.file.filename:String(req.body.image_url||'').trim();db.prepare('INSERT INTO menu_items(vendor_id,name,description,price,label,image_url,sort_order) VALUES(?,?,?,?,?,?,?)').run(req.session.user.id,name.trim().slice(0,100),String(description||'').slice(0,500),String(price||'').slice(0,20),String(label||'MADE FRESH').slice(0,60),image_url,count);setFlash(req,'Menu item added.');res.redirect('/vendor/dashboard#menu');});
app.post('/vendor/menu/:id/update',requireVendor,csrf,upload.single('image'),(req,res)=>{const item=db.prepare('SELECT * FROM menu_items WHERE id=? AND vendor_id=?').get(req.params.id,req.session.user.id);if(!item)return res.sendStatus(404);const image=req.file?'/uploads/'+req.file.filename:String(req.body.image_url||item.image_url);db.prepare('UPDATE menu_items SET name=?,description=?,price=?,label=?,image_url=?,available=? WHERE id=? AND vendor_id=?').run(String(req.body.name||'').trim().slice(0,100),String(req.body.description||'').slice(0,500),String(req.body.price||'').slice(0,20),String(req.body.label||'MADE FRESH').slice(0,60),image,req.body.available==='on'?1:0,item.id,req.session.user.id);setFlash(req,'Menu item saved.');res.redirect('/vendor/dashboard#menu');});
app.post('/vendor/menu/:id/delete',requireVendor,csrf,(req,res)=>{db.prepare('DELETE FROM menu_items WHERE id=? AND vendor_id=?').run(req.params.id,req.session.user.id);setFlash(req,'Menu item removed.');res.redirect('/vendor/dashboard#menu');});
app.post('/vendor/password',requireVendor,csrf,async(req,res)=>{if(String(req.body.new_password||'').length<10){setFlash(req,'New password must be at least 10 characters.');return res.redirect('/vendor/dashboard#account');}const hash=await bcrypt.hash(req.body.new_password,12);db.prepare('UPDATE vendors SET password_hash=? WHERE id=?').run(hash,req.session.user.id);setFlash(req,'Password changed.');res.redirect('/vendor/dashboard#account');});

// Admin authentication and all-platform management.
app.get('/admin/login',(req,res)=>res.render('login',{kind:'admin'}));
app.post('/admin/login',authLimiter,csrf,async(req,res)=>{const email=String(req.body.email||'').toLowerCase().trim();const a=db.prepare('SELECT * FROM admins WHERE email=?').get(email);if(!a||!(await bcrypt.compare(String(req.body.password||''),a.password_hash))){setFlash(req,'Email or password is incorrect.');return res.redirect('/admin/login');}req.session.user={role:'admin',id:a.id,name:a.name,email:a.email};res.redirect('/admin/dashboard');});
app.get('/admin/logout',(req,res)=>{req.session.destroy(()=>res.redirect('/admin/login'));});
app.get('/admin/dashboard',requireAdmin,(req,res)=>{const vendors=db.prepare(`SELECT v.*, (SELECT COUNT(*) FROM menu_items m WHERE m.vendor_id=v.id) menu_count,(SELECT COUNT(*) FROM feedback f WHERE f.vendor_id=v.id) review_count,(SELECT ROUND(AVG(f.rating),1) FROM feedback f WHERE f.vendor_id=v.id) avg_rating FROM vendors v ORDER BY v.created_at DESC`).all();const reviews=db.prepare('SELECT f.*,v.name vendor_name,v.slug FROM feedback f JOIN vendors v ON v.id=f.vendor_id ORDER BY f.created_at DESC LIMIT 150').all().map(f=>({...f,ordered:JSON.parse(f.ordered_json||'[]'),answers:JSON.parse(f.answers_json||'{}')}));const totals={vendors:db.prepare('SELECT COUNT(*) c FROM vendors').get().c,active:db.prepare('SELECT COUNT(*) c FROM vendors WHERE active=1').get().c,reviews:db.prepare('SELECT COUNT(*) c FROM feedback').get().c,avg:db.prepare('SELECT ROUND(AVG(rating),1) a FROM feedback').get().a||'—'};res.render('admin-dashboard',{vendors,reviews,totals});});
app.post('/admin/vendors',requireAdmin,csrf,async(req,res)=>{const {name,owner_name,email,password,category}=req.body;if(!name||!email||String(password||'').length<10){setFlash(req,'Vendor name, email and a temporary password of at least 10 characters are required.');return res.redirect('/admin/dashboard#add-vendor');}try{const hash=await bcrypt.hash(password,12);const slug=uniqueSlug(name);const info=db.prepare('INSERT INTO vendors(slug,name,owner_name,email,password_hash,category,tagline,description,logo_letter) VALUES(?,?,?,?,?,?,?,?,?)').run(slug,name.trim(),String(owner_name||'').trim(),email.trim().toLowerCase(),hash,category||'Food','LOCAL FOOD STOP','A local food story, made with care.',name.trim().charAt(0).toUpperCase());setFlash(req,`Vendor created. Share the vendor login and temporary password securely.`);res.redirect('/admin/dashboard#vendors');}catch(e){setFlash(req,'That email address is already in use.');res.redirect('/admin/dashboard#add-vendor');}});
app.post('/admin/vendors/:id/status',requireAdmin,csrf,(req,res)=>{db.prepare('UPDATE vendors SET active=? WHERE id=?').run(req.body.active==='1'?1:0,req.params.id);setFlash(req,'Vendor visibility updated.');res.redirect('/admin/dashboard#vendors');});
app.post('/admin/vendors/:id/reset-password',requireAdmin,csrf,async(req,res)=>{if(String(req.body.password||'').length<10){setFlash(req,'Password must be at least 10 characters.');return res.redirect('/admin/dashboard#vendors');}const hash=await bcrypt.hash(req.body.password,12);db.prepare('UPDATE vendors SET password_hash=? WHERE id=?').run(hash,req.params.id);setFlash(req,'Vendor password reset. Share it securely.');res.redirect('/admin/dashboard#vendors');});
app.post('/admin/vendors/:id/delete',requireAdmin,csrf,(req,res)=>{db.prepare('DELETE FROM vendors WHERE id=?').run(req.params.id);setFlash(req,'Vendor and associated menu/review data deleted.');res.redirect('/admin/dashboard#vendors');});
app.post('/admin/admin-password',requireAdmin,csrf,async(req,res)=>{if(String(req.body.password||'').length<10){setFlash(req,'Password must be at least 10 characters.');return res.redirect('/admin/dashboard#settings');}const hash=await bcrypt.hash(req.body.password,12);db.prepare('UPDATE admins SET password_hash=? WHERE id=?').run(hash,req.session.user.id);setFlash(req,'Admin password updated.');res.redirect('/admin/dashboard#settings');});

app.get('/admin/export/feedback.csv',requireAdmin,(req,res)=>{const rows=db.prepare(`SELECT v.name AS vendor,f.customer_name,f.visit_date,f.visit_type,f.rating,f.rated_dish,f.ordered_json,f.answers_json,f.created_at FROM feedback f JOIN vendors v ON v.id=f.vendor_id ORDER BY f.created_at DESC`).all();const esc=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const lines=[['Vendor','Customer','Visit date','Visit type','Rating','Dish reviewed','Ordered','Answers','Submitted'].map(esc).join(',')];for(const r of rows)lines.push([r.vendor,r.customer_name,r.visit_date,r.visit_type,r.rating,r.rated_dish,r.ordered_json,r.answers_json,r.created_at].map(esc).join(','));res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="neighbourhood-feedback.csv"');res.send('\uFEFF'+lines.join('\n'));});
app.get('/health',(req,res)=>res.json({ok:true,service:'neighbourhood'}));
app.use((err,req,res,next)=>{console.error(err);if(err instanceof multer.MulterError)return res.status(400).send('Image upload failed. Use a JPG, PNG or WEBP image under 3 MB.');res.status(500).send('Something went wrong. Please try again.');});
app.listen(PORT,()=>{console.log(`Neighbourhood server running at http://localhost:${PORT}`);console.log('Starter vendor pages: /v/ramesh-naik-street-kitchen and /v/prakashs-food-stall');});
