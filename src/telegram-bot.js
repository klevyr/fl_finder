// telegram.js - Módulo para enviar mensajes a Telegram
import https from 'https';
import { buffer } from 'stream/consumers';

class TelegramBot {
  constructor(token, chatId) {
    this.token = token;
    this.chatId = chatId;
    this.apiUrl = `https://api.telegram.org/bot${token}`;
  }

  // Método principal para enviar mensaje
  async enviarMensaje(texto, opciones = {}) {
    const {
      parseMode = 'HTML', // HTML o Markdown
      disableWebPagePreview = false,
      disableNotification = false
    } = opciones;

    const data = {
      chat_id: this.chatId,
      text: texto,
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPagePreview,
      disable_notification: disableNotification
    };

    try {
      const response = await this._enviarPeticion('sendMessage', data);
      return { success: true, messageId: response.result.message_id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Enviar trabajo individual
  async enviarTrabajo(job) {
    const mensaje = this._formatearTrabajo(job);
    return await this.enviarMensaje(mensaje);
  }

  // Enviar múltiples trabajos
  async enviarTrabajos(jobs, opciones = {}) {
    const {
      agrupar = false,
      delayEntreMensajes = 1000, // 1 segundo entre mensajes
      silencioso = false
    } = opciones;

    if (agrupar) {
      // Opción 1: Enviar todos en un solo mensaje
      return await this._enviarTrabajosAgrupados(jobs, silencioso);
    } else {
      // Opción 2: Enviar cada trabajo en mensaje separado
      return await this._enviarTrabajosIndividuales(jobs, delayEntreMensajes, silencioso);
    }
  }

  // Formatear trabajo individual
  _formatearTrabajo(job) {
    return `
🔹 <b>${job.jobTitle || 'na Titulo'}</b>

📝 ${job.jobType || ''} &#183; <b>${job.budget || ''}</b> &#183; ${job.contractorTier || ''} &#183; ${job.duration || ''}

🗃 <b>Skills</b>
${job.attibutesItems.join(' &#183; ') || ''}

🤵 About Client
⭐ ${job.clientFeedback} &#183; ${job.clientPaymentStatus} &#183; ${job.clientSpend}
🌎 ${job.clieneCountry} 🚀 ${job.proposals}

Description
<blockquote>${job.jobDescriptionText}</blockquote>

⏳ ${job.postedOn}


${job.link ? `🔗 <a href="${job.url}">Ver trabajo</a>` : ''}
    `.trim();
  }

  // Formatear múltiples trabajos en un mensaje
  _formatearTrabajoResumido(job, index) {
    return `
${index + 1}. <b>${job.titulo || 'Sin título'}</b>
   🆔 <code>${job.jobid}</code>
   ${job.url ? `🔗 <a href="${job.url}">Ver</a>` : ''}
    `.trim();
  }

  // Enviar trabajos agrupados
  async _enviarTrabajosAgrupados(jobs, silencioso) {
    if (jobs.length === 0) {
      return { success: true, enviados: 0, mensaje: 'No hay trabajos para enviar' };
    }

    const encabezado = `📋 <b>Nuevos trabajos disponibles (${jobs.length})</b>\n\n`;
    const trabajosFormateados = jobs.map((job, index) => 
      this._formatearTrabajoResumido(job, index)
    ).join('\n\n');
 
    let mensaje = encabezado + trabajosFormateados;

    // Telegram tiene límite de 4096 caracteres
    if (mensaje.length > 4096) {
      // Dividir en múltiples mensajes
      return await this._enviarMensajesLargos(jobs, silencioso);
    }

    const resultado = await this.enviarMensaje(mensaje, {
      disableNotification: silencioso,
      disableWebPagePreview: true
    });

    return {
      success: resultado.success,
      enviados: resultado.success ? jobs.length : 0,
      mensajes: 1,
      error: resultado.error
    };
  }

  // Enviar trabajos individuales con delay
  async _enviarTrabajosIndividuales(jobs, delay, silencioso) {
    const resultados = {
      exitosos: 0,
      fallidos: 0,
      errores: []
    };

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      
      try {
        const resultado = await this.enviarTrabajo(job);
        
        if (resultado.success) {
          resultados.exitosos++;
          console.log(`✅ Enviado ${i + 1}/${jobs.length}: ${job.jobid}`);
        } else {
          resultados.fallidos++;
          resultados.errores.push({ jobid: job.jobid, error: resultado.error });
          console.error(`❌ Error ${i + 1}/${jobs.length}: ${resultado.error}`);
        }

        // Esperar entre mensajes para no saturar la API
        if (i < jobs.length - 1) {
          await this._sleep(delay);
        }
      } catch (error) {
        resultados.fallidos++;
        resultados.errores.push({ jobid: job.jobid, error: error.message });
      }
    }

    return {
      success: resultados.fallidos === 0,
      enviados: resultados.exitosos,
      fallidos: resultados.fallidos,
      total: jobs.length,
      errores: resultados.errores
    };
  }

  // Dividir mensajes largos
  async _enviarMensajesLargos(jobs, silencioso) {
    const LIMITE = 4000; // Dejamos margen
    let mensajeActual = '📋 <b>Nuevos trabajos disponibles</b>\n\n';
    let contador = 0;
    const mensajesEnviados = [];

    for (let i = 0; i < jobs.length; i++) {
      const trabajoFormateado = this._formatearTrabajoResumido(jobs[i], i) + '\n\n';

      if ((mensajeActual + trabajoFormateado).length > LIMITE) {
        // Enviar mensaje actual
        const resultado = await this.enviarMensaje(mensajeActual, {
          disableNotification: silencioso,
          disableWebPagePreview: true
        });
        
        if (resultado.success) {
          mensajesEnviados.push(resultado.messageId);
          await this._sleep(1000);
        }

        // Iniciar nuevo mensaje
        mensajeActual = `📋 <b>Nuevos trabajos (continuación)</b>\n\n${trabajoFormateado}`;
      } else {
        mensajeActual += trabajoFormateado;
      }
      
      contador++;
    }

    // Enviar último mensaje
    if (mensajeActual.length > 0) {
      const resultado = await this.enviarMensaje(mensajeActual, {
        disableNotification: silencioso,
        disableWebPagePreview: true
      });
      
      if (resultado.success) {
        mensajesEnviados.push(resultado.messageId);
      }
    }

    return {
      success: true,
      enviados: contador,
      mensajes: mensajesEnviados.length,
      messageIds: mensajesEnviados
    };
  }

  // Método auxiliar para hacer peticiones
  _enviarPeticion(metodo, data) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);
      
      const options = {
        hostname: 'api.telegram.org',
        path: `/bot${this.token}/${metodo}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            
            if (response.ok) {
              resolve(response);
            } else {
              reject(new Error(response.description || 'Error desconocido'));
            }
          } catch (error) {
            reject(new Error('Error al parsear respuesta'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  // Método auxiliar para esperar
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Probar conexión
  async probarConexion() {
    try {
      const response = await this._enviarPeticion('getMe', {});
      return {
        success: true,
        bot: response.result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Exportar
export default TelegramBot;


