import nodemailer from 'nodemailer';
import {env} from '../config/env';

export function mailConfigured(){return Boolean(env.mail.user&&env.mail.password&&(env.mail.host||env.mail.user.toLowerCase().endsWith('@gmail.com')))}

export async function sendMail(options:{to:string;replyTo:string;subject:string;text:string;html:string;attachments:{filename:string;path:string;contentType?:string}[]}){
  if(!mailConfigured())throw new Error('Support email service is not configured. Configure SMTP settings on the server.');
  const gmail=!env.mail.host&&env.mail.user.toLowerCase().endsWith('@gmail.com');
  // Google displays app passwords in four groups. SMTP expects the actual
  // 16-character token, so remove display whitespace before authentication.
  const smtpPassword=gmail?env.mail.password.replace(/\s+/g,''):env.mail.password;
  const transport=nodemailer.createTransport(gmail?{service:'gmail',auth:{user:env.mail.user,pass:smtpPassword}}:{host:env.mail.host,port:env.mail.port,secure:env.mail.secure,auth:{user:env.mail.user,pass:smtpPassword}});
  try{
    return await transport.sendMail({from:env.mail.from||env.mail.user,to:options.to,replyTo:options.replyTo,subject:options.subject,text:options.text,html:options.html,attachments:options.attachments});
  }catch(error){
    const mailError=error as {code?:string;responseCode?:number};
    if(mailError.code==='EAUTH'||mailError.responseCode===535)throw new Error('Support mailbox authentication failed. Verify SMTP_USER and generate a valid Google App Password for the same account.');
    throw error;
  }
}
