// server.js
import express, { json, urlencoded } from 'express';
import dotenv from 'dotenv';
import { JSDOM } from 'jsdom';
import { getDatabase } from './database.js';

// dotenv
dotenv.config();
// create app
const app = express();
// setting
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ limit: '50mb', extended: true }));

// Importante: Habilitar CORS para localhost
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Database
const db = getDatabase();

function parseHTMLContent(htmlString) {
  const dom = new JSDOM(htmlString);
  const document = dom.window.document;

  let sections = [];
  // const section = Array.from(document).filter(node => node.nodeType === 1);
  const elements = document.querySelectorAll('section');
  if (elements.length > 0) {
    sections = Array.from(elements).map((el, index) =>
      extractTaskDescription(el, index, dom.window)
    );
  }

  return sections;
}

function extractTaskDescription(element, index, window) {
  const task = {
    uid: element.dataset.evOpening_uid,
    id: index || null,
    classes: element.className || null//,
    // content: element.innerHTML
  };

  // date interval 
  const posted_on = element.querySelector('[data-test="posted-on"]');
  task.postedOn = posted_on ? posted_on.textContent.trim() : null;

  const job_title = element.querySelector('h3, h2, h1');
  task.jobTitle = job_title ? job_title.textContent.trim() : null;

  const job_type = element.querySelector('[data-test="job-type"]');
  task.jobType = job_type ? job_type.textContent.trim() : null;

  const contractor_tier = element.querySelector('[data-test="contractor-tier"]');
  task.contractorTier = contractor_tier ? contractor_tier.textContent.trim() : null;

  const budget = element.querySelector('[data-test="budget"]');
  task.budget = budget ? budget.textContent.trim() : null;

  const duration = element.querySelector('[data-test="duration"]');
  task.duration = duration ? duration.textContent.trim() : null;

  const job_description = element.querySelector('[data-test="job-description-text"]');
  task.jobDescriptionText = job_description ? job_description.textContent.trim() : null;

  const attibutes = element.querySelectorAll('[data-test="attr-item"]');
  let attibutes_items = [];
  if (attibutes.length > 0) {
    attibutes_items = Array.from(attibutes).map((el, index) =>
      el.textContent.trim()
    );
  }
  task.attibutesItems = attibutes_items;

  const payment_status = element.querySelector('[data-test="payment-verification-status"]');
  task.clientPaymentStatus = payment_status ? payment_status.textContent.trim() : null;

  const client_spend = element.querySelector('[data-test="formatted-amount"]');
  task.clientSpend = client_spend ? client_spend.textContent.trim() : null;

  const client_feedback = element.querySelector('[data-ev-sublocation="!rating"]');
  task.clientFeedback = client_feedback ? client_feedback.textContent.trim() : null;

  const client_country = element.querySelector('[data-test="client-country"]');
  task.clientCountry = client_country ? client_country.textContent.trim() : null;

  const proposals = element.querySelector('[data-test="proposals"]');
  task.proposals = proposals ? proposals.textContent.trim() : null;

  const hire_no = element.querySelector('[data-test="freelancers-to-hire"]');
  task.freelancersToHire = hire_no ? hire_no.textContent.trim() : 1;

  return task;
}


function processAndRegisterTask(task) {
  console.log(task.uid, task['uid']);

  return task;
}


app.post('/endpoint', (req, res) => {
  console.log('📥 Datos recibidos' /*, req.body.html*/);
  const joblist = parseHTMLContent(req.body.html);
  
  const newTasks = joblist.filter( t => processAndRegisterTask(t));

  console.log(newTasks);

  res.json({
    success: true,
    message: 'Datos recibidos correctamente',
    timestamp: new Date().toISOString()
  });
});

app.listen(process.env.APP_PORT, () => {
  console.log('🚀 API corriendo en http://localhost:5000');
});

