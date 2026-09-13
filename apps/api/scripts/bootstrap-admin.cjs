/* Local operator utility. Passwords are read from the terminal, never command arguments. */
const {resolve}=require('node:path');
const {Writable}=require('node:stream');
const {createInterface}=require('node:readline/promises');
try { require('node:process').loadEnvFile(resolve(__dirname,'../../../.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const {PrismaClient}=require('@prisma/client');
const {hash}=require('bcryptjs');
async function main(){
 if(!process.stdin.isTTY)throw new Error('Run this command in an interactive terminal.');
 let muted=false;
 const output=new Writable({write(chunk,encoding,callback){if(!muted)process.stdout.write(chunk,encoding);callback();}});
 const input=createInterface({input:process.stdin,output,terminal:true});
 const prisma=new PrismaClient();
 try{
  const email=(await input.question('New administrator email: ')).trim().toLowerCase();
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email.');
  if(await prisma.user.findUnique({where:{email},select:{id:true}}))throw new Error('That account already exists. No account or role was changed.');
  process.stdout.write('Password (at least 12 characters; hidden): ');muted=true;
  const password=await input.question('');muted=false;process.stdout.write('\n');
  if(password.length<12||Buffer.byteLength(password,'utf8')>72)throw new Error('Use a password of at least 12 characters and at most 72 UTF-8 bytes.');
  process.stdout.write('Repeat password (hidden): ');muted=true;
  const repeated=await input.question('');muted=false;process.stdout.write('\n');
  if(password!==repeated)throw new Error('Passwords do not match.');
  await prisma.user.create({data:{email,passwordHash:await hash(password,12),displayName:'Administrator',role:'SUPER_ADMIN',status:'ACTIVE',emailVerifiedAt:new Date(),locale:'en'}});
  console.log('Administrator created. Sign in at http://localhost:3000/en/login and open /en/admin.');
 }finally{input.close();await prisma.$disconnect();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
