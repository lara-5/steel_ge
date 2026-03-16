import Steel from 'steel-sdk';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
const client = new Steel({ steelAPIKey: process.env.STEEL_API_KEY });
console.log('Client keys:', Object.keys(client));
console.log('Client.sessions contains:', Object.keys(client.sessions));
console.log('Client.credentials contains:', client.credentials ? Object.keys(client.credentials) : 'undefined');
console.log('Client.credential contains:', client.credential ? Object.keys(client.credential) : 'undefined');
