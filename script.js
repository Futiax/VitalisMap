// =================================================================
// script.js - Carte Temps Réel Vitalis Poitiers
// =================================================================

// --- 1. CONFIGURATION ---
// Variables globales

const URL_CIBLE = "https://transport.data.gouv.fr/resources/83390/download";
const GTFS_URL = "https://corsproxy.io/?" + encodeURIComponent(URL_CIBLE);

const LIGNES_URL = "lignes.json";
const ARRETS_URL = "arrets.json";

let map;
let ARRETS_MAPPING = {}; // Contiendra { "ID": { pos: [lat, lon], nom: "Gare" } }
let busMarkers = {}; // Pour stocker les marqueurs des bus
let dernierEtatBus = {}; // Pour mémoriser la dernière position des bus
let LIGNES_MAPPING = {};
// --- 2. INITIALISATION DE LA CARTE ---

// On centre sur Poitiers
map = L.map("map").setView([46.58, 0.33], 12);

// Fond de carte (OpenStreetMap version claire)
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
	attribution: "© OpenStreetMap contributors",
	maxZoom: 21,
}).addTo(map);

// --- 3. DÉMARRAGE DE L'APPLICATION ---

async function demarrerApplication() {
	try {
		// ... (chargement des arrêts existant) ...
		const responseArrets = await fetch(ARRETS_URL);
		ARRETS_MAPPING = await responseArrets.json();

		// --- NOUVEAU BLOC : Chargement des LIGNES ---
		console.log("Chargement des tracés...");
		const responseLignes = await fetch(LIGNES_URL);
		if (responseLignes.ok) {
			const lignesData = await responseLignes.json();
			LIGNES_MAPPING = lignesData;
			afficherLignes(lignesData);
		} else {
			console.warn("Fichier lignes.json non trouvé (lance le script python !)");
		}
		afficherFondDeCarte();

		chargerBus();
		setInterval(chargerBus, 10000);
	} catch (error) {
		console.error(error);
	}
}

// --- 4. FONCTIONS D'AFFICHAGE ---

// Affiche tous les arrêts fixes (petits points gris)
function afficherFondDeCarte() {
	// On utilise un Canvas pour que ce soit performant avec 2000 points
	const myRenderer = L.canvas({ padding: 0.5 });

	for (const [id, info] of Object.entries(ARRETS_MAPPING)) {
		// Info contient : { pos: [lat, lon], nom: "Nom Arrêt" }

		L.circleMarker(info.pos, {
			renderer: myRenderer,
			radius: 6,
			color: "#888", // Contour gris
			fillColor: "#aaa", // Remplissage gris clair
			fillOpacity: 0.6,
			weight: 1,
		})
			.bindPopup(`<b>Arrêt :</b> ${info.nom}<br><small>ID: ${id}</small>`)
			.addTo(map);
	}
}

function afficherLignes(lignesData) {
	// On parcourt chaque ligne du fichier JSON
	for (const [id, info] of Object.entries(lignesData)) {
		// On dessine la ligne
		const polyline = L.polyline(info.points, {
			color: info.color, // La couleur officielle de la STGA
			weight: 4, // Épaisseur du trait
			opacity: 0.6, // Un peu transparent
			smoothFactor: 1, // Lissage
		}).addTo(map);

		// On ajoute une popup si on clique sur la ligne
		polyline.bindPopup(`<b>Ligne ${info.name}</b>`);

		// IMPORTANT : On met les lignes tout au fond pour ne pas cacher les bus
		polyline.bringToBack();
	}
	console.log("✅ Lignes tracées sur la carte.");
}
// Récupère et décode les bus
function chargerBus() {
	// On charge la définition du langage "Protobuf"
	protobuf.load("gtfs-realtime.proto", function (err, root) {
		if (err) return console.error("Erreur chargement fichier .proto:", err);

		const FeedMessage = root.lookupType("transit_realtime.FeedMessage");

		// On télécharge le fichier binaire via le Proxy
		fetch(GTFS_URL)
			.then((res) => {
				if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
				return res.arrayBuffer();
			})
			.then((buffer) => {
				const message = FeedMessage.decode(new Uint8Array(buffer));
				const object = FeedMessage.toObject(message, { longs: String, enums: String });

				const entities = object.entity;

				// On vérifie si ça a bougé
				if (verifierMouvements(entities)) {
					mettreAJourBus(entities);
				} else {
					console.log("💤 Aucun bus n'a bougé.");
				}
			})
			.catch((err) => console.error("Erreur récupération flux bus:", err));
	});
}

// Place les bus sur la carte
function mettreAJourBus(entities) {
	// 1. On efface les anciens bus
	for (let id in busMarkers) map.removeLayer(busMarkers[id]);
	busMarkers = {};

	if (!entities || entities.length === 0) return;

	let compteurBus = 0;

	entities.forEach((entity) => {
		let routeId = null; // L'ID technique (ex: "201")
		let pos = null;
		let nomArret = "Inconnu";
		let retard = 0;
		let isGps = false;
		let busId = entity.id;

		// --- Récupération des données selon le type (GPS ou ESTIMÉ) ---
		if (entity.tripUpdate) {
			routeId = entity.tripUpdate.trip.routeId;

			// Récup position via arrêt
			if (entity.tripUpdate.stopTimeUpdate?.length > 0) {
				const nextStop = entity.tripUpdate.stopTimeUpdate[0];
				const stopId = nextStop.stopId;
				retard = nextStop.arrival ? nextStop.arrival.delay : 0;
				const infoArret = ARRETS_MAPPING[stopId];
				if (infoArret) {
					pos = infoArret.pos;
					nomArret = infoArret.nom;
					isGps = false;
				}
			}
		} else if (entity.vehicle && entity.vehicle.position) {
			routeId = entity.vehicle.trip.routeId;
			const p = entity.vehicle.position;
			pos = [p.latitude, p.longitude];
			nomArret = "Position GPS";
			isGps = true;
		}

		// --- C'EST ICI QUE LA MAGIE OPÈRE ---
		if (pos && routeId) {
			// Par défaut, on affiche l'ID technique
			let nomAffiche = routeId;

			// Si on trouve la ligne dans notre fichier JSON, on prend son "name" (ex: "1")
			if (LIGNES_MAPPING[routeId] && LIGNES_MAPPING[routeId].name) {
				nomAffiche = LIGNES_MAPPING[routeId].name;
			}

			// On appelle la création du marqueur avec le JOLI NOM
			creerMarqueurBus(busId, pos, nomAffiche, nomArret, retard, isGps);
			compteurBus++;
		}
	});

	console.log(`🚌 ${compteurBus} bus affichés.`);
}

function creerMarqueurBus(id, coords, ligne, nomArret, retard, isGps) {
	// Le style de la bulle rouge
	const icon = L.divIcon({
		className: "bus-marker",
		html: ligne, // Le numéro de ligne
		iconSize: [21, 21],
		popupAnchor: [-11, -11],
	});

	// Le contenu de la popup (info-bulle)
	let popupText = `<div style="text-align:center; font-family:sans-serif;">
                        <strong style="font-size:1.4em; color:#E30613;">Bus ${ligne}</strong><br>
                        <hr style="margin:1px 0; border:0; border-top:1px solid #eee;">`;

	if (isGps) {
		popupText += `📍 <em>Position GPS exacte</em>`;
	} else {
		popupText += `➡️ Vers : <strong>${nomArret}</strong><br>`;

		// Couleur dynamique pour le retard
		let color = "green";
		let retardTexte = "À l'heure";

		if (retard > 60) {
			color = "orange";
			retardTexte = `+${Math.floor(retard / 60)} min`;
		}
		if (retard > 300) {
			color = "red";
		} // Plus de 5 min

		popupText += `🕒 Statut : <span style="color:${color}; font-weight:bold;">${retardTexte}</span>`;
	}
	popupText += `</div>`;

	// On crée le marqueur avec un zIndexOffset élevé pour qu'il soit toujours AU-DESSUS des arrêts gris
	const marker = L.marker(coords, {
		icon: icon,
		zIndexOffset: 1000,
	})
		.bindPopup(popupText)
		.addTo(map);

	busMarkers[id] = marker;
}

function verifierMouvements(entities) {
	let aBouge = false;
	let nouvelEtat = {}; // On prépare le cache pour le prochain tour

	if (!entities) return false;

	entities.forEach((entity) => {
		let busId = entity.id;
		let signaturePosition = "";

		// Cas 1 : C'est du GPS
		if (entity.vehicle && entity.vehicle.position) {
			const pos = entity.vehicle.position;
			// La signature est "LAT,LON"
			signaturePosition = `GPS:${pos.latitude.toFixed(5)},${pos.longitude.toFixed(5)}`;
		}
		// Cas 2 : C'est un arrêt (TripUpdate)
		else if (entity.tripUpdate) {
			const update = entity.tripUpdate;
			if (update.stopTimeUpdate && update.stopTimeUpdate.length > 0) {
				const nextStop = update.stopTimeUpdate[0];
				// La signature est l'ID de l'arrêt
				signaturePosition = `STOP:${nextStop.stopId}`;
			}
		}

		// Si on a trouvé une position valide
		if (signaturePosition !== "") {
			nouvelEtat[busId] = signaturePosition;

			// COMPARAISON : Est-ce que c'est différent d'avant ?
			if (dernierEtatBus[busId] !== signaturePosition) {
				aBouge = true;
				let time = new Date();
				console.log(`${time.toTimeString()} : Le bus ${entity.tripUpdate.trip.tripId} a bougé !\n`);
			}
		}
	});

	// On met à jour la mémoire globale pour la prochaine fois
	dernierEtatBus = nouvelEtat;

	return aBouge;
}
// --- 5. LANCEMENT ---
demarrerApplication();
