import nodemailer from 'nodemailer';
import {env} from '../config/env';

export function mailConfigured(){return Boolean(env.mail.user&&env.mail.password&&(env.mail.host||env.mail.user.toLowerCase().endsWith('@gmail.com')))}

export async function sendMail(options:{to:string;replyTo:string;subject:string;text:string;html:string;attachments:{filename:string;path:string;contentType?:string}[]}){
  if(!mailConfigured())throw new Error('Support email service is not configured. Configure SMTP settings on the server.');
  const gmail=!env.mail.host&&env.mail.user.toLowerCase().endsWith('@gmail.com');
  const transport=nodemailer.createTransport(gmail?{service:'gmail',auth:{user:env.mail.user,pass:env.mail.password}}:{host:env.mail.host,port:env.mail.port,secure:env.mail.secure,auth:{user:env.mail.user,pass:env.mail.password}});
  return transport.sendMail({from:env.mail.from||env.mail.user,to:options.to,replyTo:options.replyTo,subject:options.subject,text:options.text,html:options.html,attachments:options.attachments});
}
