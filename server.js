"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var path_1 = require("path");
var vite_1 = require("vite");
var genai_1 = require("@google/genai");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var app = (0, express_1.default)();
var PORT = 3000;
app.use(express_1.default.json());
// API route for AI text proofreading & correction
app.post('/api/correct-text', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var text, apiKey, ai, response, corrected, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                text = req.body.text;
                if (!text || typeof text !== 'string' || !text.trim()) {
                    return [2 /*return*/, res.status(400).json({ error: 'Nessun testo fornito per la correzione.' })];
                }
                apiKey = process.env.GEMINI_API_KEY;
                if (!apiKey) {
                    return [2 /*return*/, res.status(500).json({
                            error: 'Chiave GEMINI_API_KEY non configurata. Configurala nei segreti per abilitare la correzione AI.',
                        })];
                }
                ai = new genai_1.GoogleGenAI({ apiKey: apiKey });
                return [4 /*yield*/, ai.models.generateContent({
                        model: 'gemini-3.8-flash',
                        contents: "Sei un assistente per la scrittura di un diario personale.\nIl tuo unico compito \u00E8 correggere eventuali refusi di battitura, errori grammaticali, ortografici e di punteggiatura nel testo seguente, riordinando le frasi in modo fluido, pulito e naturale in lingua italiana.\n\nREGOLE TASSATIVE:\n1. NON cambiare assolutamente il significato, le emozioni, i dettagli o il punto di vista dell'autore.\n2. Mantieni il tono autentico e intimo del diario.\n3. NON aggiungere commenti, introduzioni, spiegazioni, saluti n\u00E9 racchiudere il testo tra virgolette.\n4. Restituisci ESCLUSIVAMENTE il testo corretto finale.\n\nTesto originale:\n\"\"\"\n".concat(text, "\n\"\"\""),
                    })];
            case 1:
                response = _b.sent();
                corrected = ((_a = response.text) === null || _a === void 0 ? void 0 : _a.trim()) || text;
                return [2 /*return*/, res.json({
                        success: true,
                        original: text,
                        corrected: corrected,
                    })];
            case 2:
                error_1 = _b.sent();
                console.error('Errore durante la correzione del testo:', error_1);
                return [2 /*return*/, res.status(500).json({
                        error: error_1.message || 'Errore durante la correzione del testo con il servizio AI.',
                    })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Vite middleware setup
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        var vite, distPath_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(process.env.NODE_ENV !== 'production')) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, vite_1.createServer)({
                            server: { middlewareMode: true },
                            appType: 'spa',
                        })];
                case 1:
                    vite = _a.sent();
                    app.use(vite.middlewares);
                    return [3 /*break*/, 3];
                case 2:
                    distPath_1 = path_1.default.join(process.cwd(), 'dist');
                    app.use(express_1.default.static(distPath_1));
                    app.get('*', function (_req, res) {
                        res.sendFile(path_1.default.join(distPath_1, 'index.html'));
                    });
                    _a.label = 3;
                case 3:
                    app.listen(PORT, '0.0.0.0', function () {
                        console.log("Server avviato su http://0.0.0.0:".concat(PORT));
                    });
                    return [2 /*return*/];
            }
        });
    });
}
startServer();
