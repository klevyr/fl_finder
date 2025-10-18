// ==UserScript==
// @name         UpWork Daemon
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Actualiza la página periódicamente y envía contenido a una API
// @author       @klevyr
// @match        https://www.upwork.com/nx/find-work/most-recent*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=upwork.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // ========== CONFIGURACIÓN ==========
    const CONFIG = {
        // Intervalo de actualización en milisegundos (60000 = 1 minuto)
        // 3600000 - 60m
        // 300000 - 5m
        refreshInterval: 300000,

        // URL de tu API
        apiUrl: 'http://localhost:5000/endpoint',

        // Token de autenticación (opcional)
        apiToken: 'tu_token_aqui',

        // Selector CSS del contenido que quieres capturar
        contentSelector: '[data-test="job-tile-list"]',

        // Activar logs en consola
        debug: true
    };
    // ========== VARIABLES GLOBALES ==========
    let refreshTimer = null;
    let lastContent = '';

    // ========== FUNCIONES AUXILIARES ==========

    /**
     * Log de debug
     */
    function log(message, data = null) {
        if (CONFIG.debug) {
            console.log(`[UserScript] ${message}`, data || '');
        }
    }

    /**
     * Extrae el contenido de la página
     */
    function extractContent() {
        const elements = document.querySelectorAll(CONFIG.contentSelector);

        if (elements.length === 0) {
            log('⚠️ No se encontraron elementos con el selector:', CONFIG.contentSelector);
            return null;
        }

        // Opción 1: Extraer texto plano
        const textContent = Array.from(elements)
            .map(el => el.textContent.trim())
            .join('\n\n');

        // Opción 2: Extraer HTML
        const htmlContent = Array.from(elements)
            .map(el => el.innerHTML)
            .join('\n');

        // Opción 3: Extraer datos específicos (ejemplo)
        const structuredData = Array.from(elements).map(el => ({
            text: el.textContent.trim(),
            html: el.innerHTML,
            attributes: {
                id: el.id,
                class: el.className
            }
        }));

        return {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            text: textContent,
            html: htmlContent,
            structured: structuredData,
            pageTitle: document.title
        };
    }

    /**
     * Envía datos a la API
     */
    function sendToAPI(data) {
        log('📤 Enviando datos a API...');

        // Usar GM_xmlhttpRequest para evitar restricciones CORS
        GM_xmlhttpRequest({
            method: 'POST',
            url: CONFIG.apiUrl,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiToken}`
            },
            data: JSON.stringify(data),
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    log('✅ Datos enviados correctamente', response.responseText);
                    showNotification('Datos enviados correctamente', 'success');
                } else {
                    log('❌ Error al enviar datos:', response.statusText);
                    showNotification('Error al enviar datos', 'error');
                }
            },
            onerror: function(error) {
                log('❌ Error de red:', error);
                showNotification('Error de conexión', 'error');
            },
            ontimeout: function() {
                log('❌ Timeout de la petición');
                showNotification('Timeout de conexión', 'error');
            },
            timeout: 10000 // 10 segundos
        });
    }

    /**
     * Verifica si el contenido ha cambiado
     */
    function hasContentChanged(newContent) {
        const newHash = JSON.stringify(newContent);
        if (newHash === lastContent) {
            return false;
        }
        lastContent = newHash;
        return true;
    }

    /**
     * Procesa el contenido y lo envía si ha cambiado
     */
    function processAndSend() {
        log('🔍 Extrayendo contenido...');

        const content = extractContent();

        if (!content) {
            log('⚠️ No se pudo extraer contenido');
            return;
        }

        // Verificar si el contenido cambió
        if (!hasContentChanged(content)) {
            log('ℹ️ El contenido no ha cambiado, omitiendo envío');
            return;
        }

        log('✨ Contenido nuevo detectado');
        sendToAPI(content);
    }

    /**
     * Actualiza la página
     */
    function refreshPage() {
        log('🔄 Actualizando página...');

        // Guardar posición de scroll
        const scrollPos = window.scrollY;
        GM_setValue('scrollPosition', scrollPos);

        // Recargar página
        location.reload();
    }

    /**
     * Restaura la posición de scroll después de recargar
     */
    function restoreScrollPosition() {
        const savedPos = GM_getValue('scrollPosition', 0);
        if (savedPos > 0) {
            window.scrollTo(0, savedPos);
            GM_setValue('scrollPosition', 0);
        }
    }

    /**
     * Muestra una notificación visual
     */
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transition = 'opacity 0.3s';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Crea panel de control
     */
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.innerHTML = `
            <div style="position: fixed; bottom: 20px; right: 20px; background: #333; color: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); z-index: 9999; font-family: Arial, sans-serif;">
                <div style="font-weight: bold; margin-bottom: 10px;">UserScript Control</div>
                <button id="us-send-now" style="padding: 8px 12px; margin: 5px; cursor: pointer; background: #4CAF50; border: none; border-radius: 4px; color: white;">
                    📤 Enviar Ahora
                </button>
                <button id="us-refresh-now" style="padding: 8px 12px; margin: 5px; cursor: pointer; background: #2196F3; border: none; border-radius: 4px; color: white;">
                    🔄 Actualizar
                </button>
                <button id="us-toggle" style="padding: 8px 12px; margin: 5px; cursor: pointer; background: #ff9800; border: none; border-radius: 4px; color: white;">
                    ⏸️ Pausar
                </button>
                <div id="us-status" style="margin-top: 10px; font-size: 12px; color: #aaa;">
                    Estado: Activo
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Event listeners
        document.getElementById('us-send-now').addEventListener('click', () => {
            processAndSend();
        });

        document.getElementById('us-refresh-now').addEventListener('click', () => {
            refreshPage();
        });

        let isActive = true;
        document.getElementById('us-toggle').addEventListener('click', (e) => {
            isActive = !isActive;
            if (isActive) {
                startAutoRefresh();
                e.target.textContent = '⏸️ Pausar';
                document.getElementById('us-status').textContent = 'Estado: Activo';
            } else {
                stopAutoRefresh();
                e.target.textContent = '▶️ Reanudar';
                document.getElementById('us-status').textContent = 'Estado: Pausado';
            }
        });
    }

    /**
     * Inicia el auto-refresh
     */
    function startAutoRefresh() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
        }

        refreshTimer = setInterval(() => {
            refreshPage();
        }, CONFIG.refreshInterval);

        log(`✅ Auto-refresh iniciado (cada ${CONFIG.refreshInterval/1000} segundos)`);
    }

    /**
     * Detiene el auto-refresh
     */
    function stopAutoRefresh() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
        log('⏸️ Auto-refresh detenido');
    }

    // ========== INICIALIZACIÓN ==========

    /**
     * Función principal de inicialización
     */
    function init() {
        log('🚀 UserScript iniciado');

        // Restaurar posición de scroll después de recargar
        restoreScrollPosition();

        // Esperar 2 segundos para que la página cargue completamente
        // y luego procesar y enviar el contenido inicial
        setTimeout(() => {
            processAndSend();
        }, 2000);

        // Iniciar el temporizador de auto-refresh
        startAutoRefresh();

        // Crear el panel de control visual
        createControlPanel();
    }

    // Ejecutar init() cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
