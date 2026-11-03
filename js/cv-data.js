// ============================================================
//  CONTENU DU CV : c'est le seul fichier à modifier pour
//  personnaliser le site. Tout le reste s'adapte automatiquement.
// ============================================================
//
//  Icônes disponibles : folder, briefcase, cap, gear, trophy, gamepad,
//  mail, card, doc, docBlue, docGreen, docRed, docPurple, computer
//
//  Types de catégorie :
//   - "note"    → ouvre un Bloc-notes avec `content`
//   - "folder"  → ouvre un explorateur listant `items` (cliquables)
//   - "contact" → ouvre un carnet d'adresses avec `links` ({ label, value, href } ou, pour
//     une adresse e-mail protégée, { label, email } : base64 de l'adresse écrite à l'envers)
//
//  Un document peut avoir des `photos` : [{ art, caption }] ou [{ img, caption }] (fichier image ;
//  ajouter `pixel: true` pour une image pixel art à agrandir sans lissage, `full` pour la version
//  nette ouverte au clic, `wide` si elle est en paysage et `pano` pour un polaroid panoramique),
//  affichées en polaroids punaisés.
//  `web: { label, url }` ajoute un lien cliquable sous le résumé d'un document.
//  `school: { name, photos }` ajoute l'école avec ses photos en dessous (`about` : texte facultatif) ;
//  `link` + `linkLabel` affichent un bouton vers la page (défaut : « Voir le projet »).
//  Sur un dossier, `photosLast: true` affiche les photos de ses documents après leur contenu.
//  Illustrations disponibles (js/pixelart.js) : clap, reel, popcorn, bike, road, map, ball,
//  hoop, court, code, atom, postgres, sqlserver, git, containers, rocket, chart, pipeline,
//  headset, server, shield, kanban, sprint, fr, en

export const CV = {
  owner: {
    name: "Mehdi PICHARD",
    title: "Développeur",
    // CV téléchargeable (imprimante de la chambre + menu démarrer)
    cvFile: "assets/CV_Mehdi_PICHARD.pdf",
  },

  // Aperçu dessiné sur la feuille qui sort de l'imprimante
  printout: {
    name: "Mehdi PICHARD",
    title: "Développeur",
    contact: "Gennevilliers | github.com/Mehdi-Pic | linkedin.com/in/mehdi-pichard",
    sections: ["PROFIL", "COMPÉTENCES", "PROJET", "EXPÉRIENCE PROFESSIONNELLE", "FORMATION", "LANGUES & CENTRES D'INTÉRÊT"],
  },

  categories: [
    {
      id: "about",
      label: "À propos",
      file: "a_propos.txt",
      icon: "card",
      type: "note",
      content:
`Bonjour ! 👋

Je m'appelle Mehdi PICHARD et je suis développeur
full-stack, titulaire d'un Master Expert en informatique
et système d'information, basé à Gennevilliers.

Je développe des applications web, du front en passant
par le back jusqu'à la mise en production.

Mon parcours en data et cloud m'apporte aussi une solide
culture de l'infrastructure et des données.

> Projet du moment : GenDon (gendon.fr), une plateforme
  de dons entre particuliers à Gennevilliers.
> Mon code : github.com/Mehdi-Pic

Bonne visite ! Cliquez sur les icônes du bureau pour
fouiller dans mes dossiers.`,
    },

    {
      id: "exp",
      label: "Expériences",
      icon: "briefcase",
      type: "folder",
      description: "Mon parcours professionnel, du plus récent au plus ancien.",
      items: [
        {
          file: "Support_IT_Mairie_Gennevilliers.doc",
          icon: "docBlue",
          title: "Technicien Support Informatique (DSI)",
          org: "Mairie de Gennevilliers",
          date: "10 au 21 août 2026",
          place: "Gennevilliers",
          bullets: [
            "Support N1/N2 aux agents : diagnostic et résolution d'incidents, gestion des tickets via GLPI et assistance à distance via TeamViewer",
            "Gestion et déploiement d'un parc de 1 500+ postes répartis sur ~80 sites : installation, configuration, inventaire GLPI et migration vers Windows 11",
            "Administration des postes et équipements avec Microsoft Intune, Entra ID, BitLocker et MyQ ; gestion des accès, applications et périphériques",
            "Participation aux opérations d'infrastructure et de sécurité : Veeam (sauvegarde VM/bandes), SentinelOne, Sophos Firewall, KeePass et gestion des privilèges administrateur",
          ],
          tags: ["GLPI", "TeamViewer", "Intune", "Entra ID", "BitLocker", "MyQ", "Veeam", "SentinelOne", "Sophos Firewall", "KeePass"],
        },
        {
          file: "Analyste_BI_ICF_Habitat.doc",
          icon: "docBlue",
          title: "Analyste Programmeur BI / Data",
          org: "ICF Habitat (SNCF Immobilier)",
          date: "2021 - 2023",
          place: "Paris",
          bullets: [
            "Pipeline ETL (SSIS) AS400 vers SQL : refonte du schéma legacy, chargement vers un entrepôt historisé multi-années, automatisé par jobs planifiés",
            "Environnement Power BI de la Direction Financière avec actualisation automatique, en remplacement d'un rafraîchissement manuel mensuel ; dashboard de qualité des données filtrable par société",
            "Documentation de la traçabilité des données (mapping source-destination, règles) ; hachage des données sensibles",
            "Prototype de chatbot interne (Azure OpenAI + Cognitive Search, RAG) intégré en Python ; Agile (backlog BI hebdomadaire), Azure DevOps (Repos, revue de code, Pipelines)",
          ],
          tags: ["SSIS", "SQL Server", "Power BI", "Python", "Azure OpenAI", "Azure DevOps", "Agile"],
        },
      ],
    },

    {
      id: "edu",
      label: "Formations",
      icon: "cap",
      type: "folder",
      description: "Diplômes et formations.",
      items: [
        {
          file: "Master_Expert_IT.doc",
          icon: "docPurple",
          title: "Master Expert Informatique et Système d'Information",
          org: "EPSI",
          date: "2021 - 2023",
          place: "La Défense",
          summary: "Titre RNCP de niveau 7 (Bac+5), obtenu en 2023. J'y ai appris à analyser un système d'information et à piloter les projets qui le font évoluer.",
          bullets: [
            "Gestion de projet : concevoir, préparer et piloter des projets du SI, côté applicatif comme côté infrastructure",
            "Qualité des systèmes : tenir compte de la performance, de la fiabilité et de la sécurité, sans perdre de vue les coûts",
          ],
          school: {
            name: "EPSI Paris",
            photos: [
              { img: "assets/ecoles/epsi_campus.webp", full: "assets/ecoles/epsi_campus_hd.webp", wide: true, caption: "Le campus" },
              { img: "assets/ecoles/epsi_defense.webp", full: "assets/ecoles/epsi_defense_hd.webp", wide: true, caption: "La Défense" },
            ],
          },
        },
        {
          file: "Bachelor_DevOps.doc",
          icon: "docPurple",
          title: "Bachelor DevOps",
          org: "EPSI",
          date: "2020 - 2021",
          place: "La Défense",
          summary: "Titre RNCP de niveau 6 (Bac+3) « Concepteur développeur d'applications ». Une année consacrée à développer des applications complètes et à les mettre en production.",
          bullets: [
            "Développement : front-end, back-end et mobile en Python, Java et JavaScript, avec leurs bases de données",
            "DevOps : conteneurisation avec Docker, intégration et déploiement continus (CI/CD), mise en production",
            "Travail en équipe : projets menés en méthode Agile, avec plans de tests et documentation du déploiement",
          ],
          school: {
            name: "EPSI Paris",
            photos: [
              { img: "assets/ecoles/epsi_campus.webp", full: "assets/ecoles/epsi_campus_hd.webp", wide: true, caption: "Le campus" },
              { img: "assets/ecoles/epsi_defense.webp", full: "assets/ecoles/epsi_defense_hd.webp", wide: true, caption: "La Défense" },
            ],
          },
        },
        {
          file: "BTS_SN_IR.doc",
          icon: "docPurple",
          title: "BTS Systèmes Numériques option Informatique et Réseaux (SNIR)",
          org: "École Agora",
          date: "2018 - 2020",
          place: "Puteaux",
          summary: "BTS de niveau Bac+2, où j'ai posé mes bases en réseaux et en développement.",
          bullets: [
            "Réseaux : étude, conception, exploitation et maintenance de réseaux informatiques",
            "Développement : logiciel et valorisation de la donnée",
            "Cybersécurité : premières notions et bonnes pratiques",
          ],
          school: {
            name: "Lycée Agora",
            photos: [
              { img: "assets/ecoles/agora_pano.webp", full: "assets/ecoles/agora_pano_hd.webp", wide: true, pano: true, caption: "Le lycée, côté cour" },
            ],
          },
          // fiche officielle du diplôme (France compétences), pas une page d'école
          link: "https://www.francecompetences.fr/recherche/rncp/35341/",
          linkLabel: "Voir le diplôme",
        },
      ],
    },

    {
      id: "skills",
      label: "Compétences",
      icon: "gear",
      type: "folder",
      photosLast: true,
      description: "Ce que je sais faire, par domaine.",
      items: [
        {
          file: "Langages_Frameworks",
          icon: "folder",
          title: "Langages & Frameworks",
          photos: [{ art: "code", caption: "TypeScript" }, { art: "atom", caption: "React / Next.js" }, { art: "postgres", caption: "PostgreSQL" }],
          tags: ["TypeScript", "React", "Next.js", "Tailwind CSS", "HTML/CSS", "Java", "Python", "FastAPI", "API REST", "PostgreSQL (SQLAlchemy)", "SQL"],
        },
        {
          file: "DevOps_Cloud",
          icon: "folder",
          title: "DevOps & Cloud",
          photos: [{ art: "git", caption: "Git" }, { art: "containers", caption: "Docker" }, { art: "rocket", caption: "Mise en prod" }],
          tags: ["Git", "Vercel", "Railway", "Docker", "Azure DevOps"],
        },
        {
          file: "Data_BI",
          icon: "folder",
          title: "Data & BI",
          photos: [{ art: "chart", caption: "Power BI" }, { art: "pipeline", caption: "ETL SSIS" }, { art: "sqlserver", caption: "SQL Server" }],
          tags: ["SSIS", "Power BI", "SQL Server"],
        },
        {
          file: "Support_Infra_IT",
          icon: "folder",
          title: "Support & Infrastructure IT",
          photos: [{ art: "headset", caption: "Support N1/N2" }, { art: "server", caption: "Infra & sauvegardes" }, { art: "shield", caption: "Sécurité" }],
          tags: ["GLPI", "TeamViewer", "Microsoft Intune", "Entra ID", "BitLocker", "MyQ", "Veeam", "SentinelOne", "Sophos Firewall", "KeePass"],
        },
        {
          file: "Methodes",
          icon: "folder",
          title: "Méthodes",
          photos: [{ art: "kanban", caption: "Kanban" }, { art: "sprint", caption: "Scrum" }],
          tags: ["Agile", "Scrum", "Kanban"],
        },
        {
          file: "Langues",
          icon: "folder",
          title: "Langues",
          photos: [{ art: "fr", caption: "Français" }, { art: "en", caption: "Anglais" }],
          bullets: ["Français : langue maternelle", "Anglais : bilingue"],
        },
      ],
    },

    {
      id: "projects",
      label: "Projets",
      icon: "trophy",
      type: "folder",
      description: "Mes projets.",
      items: [
        {
          file: "GenDon.exe",
          icon: "docGreen",
          title: "GenDon : plateforme de dons locaux entre particuliers",
          org: "Gennevilliers · gendon.fr",
          date: "Depuis juin 2026",
          summary: "Conçue à la demande du collectif zéro déchet pour favoriser le don gratuit d'objets, limiter les déchets et promouvoir le recyclage ; en production, 1er des recherches Google sur sa requête cible locale.",
          bullets: [
            "Application full-stack : Next.js 16 / React 19 / TypeScript / Tailwind CSS, API REST FastAPI / PostgreSQL ; déploiement multi-services (Vercel, Railway, Cloudinary, Resend)",
            "Authentification sécurisée côté serveur (JWT via JWKS), droits et favoris calculés serveur ; backend asynchrone, pipeline images et tâches planifiées (purge, rappels)",
            "Compte actuellement 42 utilisateurs et 16 annonces publiées ; responsive mobile et conformité RGPD (mentions légales, confidentialité, suppression automatique des données à 30 jours)",
          ],
          tags: ["Next.js", "React", "TypeScript", "Tailwind CSS", "FastAPI", "PostgreSQL", "Vercel", "Railway"],
          link: "https://gendon.fr",
        },
        {
          file: "anime.exe",
          icon: "docGreen",
          title: "anime. : un Letterboxd pour l'anime",
          org: "Application web full-stack",
          date: "Depuis septembre 2026",
          summary: "Un journal de visionnage pensé pour l'anime, où l'on suit, note et critique chaque niveau, de la franchise à l'épisode ; le catalogue se remplit tout seul depuis TheTVDB.",
          bullets: [
            "Catalogue automatique : un worker (pg-boss) amorce le catalogue depuis l'API TheTVDB, suit ses mises à jour et reprend où il s'était arrêté (curseur en base, verrou contre deux synchronisations, arrêt propre)",
            "Côté membres : journal, notes et critiques par œuvre, saison ou épisode, listes, abonnements, profils publics et statistiques ; calendrier des sorties de la saison dans le fuseau du lecteur",
            "Données : PostgreSQL 18 (recherche tolérante aux fautes et aux accents) via Drizzle ORM, comptes locaux sécurisés (scrypt, sessions en base), export CSV complet",
            "Qualité : tests de bout en bout Playwright, intégration continue GitHub Actions, décisions d'architecture documentées",
          ],
          tags: ["Next.js", "React", "TypeScript", "Tailwind CSS", "PostgreSQL", "Drizzle", "pg-boss", "Playwright", "Docker", "GitHub Actions"],
        },
        {
          file: "IA_locale.exe",
          icon: "docGreen",
          title: "IA générative en local",
          org: "Sur mon PC · Radeon RX 6900 XT (16 Go)",
          date: "2026",
          summary: "Faire tourner chez moi, sans cloud, un modèle de langage de 27 milliards de paramètres et un générateur d'images, chaque réglage mesuré pour tenir dans 16 Go de mémoire vidéo.",
          bullets: [
            "Qwen3.8 27B : modèle quantifié (GGUF) servi par LM Studio sur Vulkan, vision comprise ; décodage spéculatif MTP et cache KV compressé, 52 tokens/s en code contre 28 sans MTP, avec 40 000 tokens de contexte",
            "Agent de code : DeepSeek Harness branché sur ce modèle, presets et compaction du contexte recalés pour une machine locale",
            "Lanceur IA : application Windows en C# (WinForms, sans dépendance) qui démarre le serveur, charge le modèle avec son preset, attend que l'API l'expose avant d'ouvrir l'agent, et libère la mémoire vidéo d'un clic",
            "Qwen-Image : génération et retouche d'images dans ComfyUI sur carte graphique AMD (ROCm), pilotées par des workflows en API",
          ],
          tags: ["LM Studio", "llama.cpp / GGUF", "Vulkan", "ComfyUI", "ROCm", "C#", "WinForms", "Python"],
        },
        {
          file: "Dots.exe",
          icon: "docGreen",
          title: "Dots : une équipe d'agents IA",
          org: "Application locale · Claude Agent SDK",
          date: "2026",
          summary: "Des collègues IA persistants : je parle à un agent coordinateur, qui découpe le travail en tickets, le répartit entre des agents développeurs puis le fait vérifier.",
          bullets: [
            "Orchestration : le coordinateur rédige des tickets (priorité, critères d'acceptation, dépendances) que 1 à 4 agents développeurs prennent en parallèle, les plus urgents d'abord",
            "Vérification : un agent vérificateur contrôle chaque critère (build, tests, navigateur piloté par Playwright) puis valide le ticket ou le renvoie en correction",
            "Garde-fous : autonomie réglable, outils de fichiers confinés au dossier de travail, validation demandée avant toute suppression ; tâches planifiées et connecteurs MCP",
          ],
          tags: ["TypeScript", "Claude Agent SDK", "Hono", "React", "Vite", "Playwright", "MCP"],
        },
        {
          file: "Shorts_Studio.exe",
          icon: "docGreen",
          title: "Shorts éducatifs animés",
          org: "YouTube Shorts · TikTok · Reels",
          date: "Depuis septembre 2026",
          summary: "Un pipeline qui produit des vidéos courtes de culture générale en anglais, du script au montage, avec un contrôle des faits avant chaque voix off.",
          bullets: [
            "Pipeline : choix du sujet, script, relecture des faits par une IA contradictoire (sujet abandonné si les faits ne tiennent pas), voix, animation, puis contrôle qualité final",
            "Animation : vidéos verticales 1080×1920 codées en React avec Remotion ; sous-titres et textes à l'écran générés depuis des fichiers de données",
            "Créateur de voix : service partagé de synthèse vocale ElevenLabs (ligne de commande, module Node ou API locale), avec cache et suivi des crédits",
            "Une douzaine de vidéos terminées, de Waterloo au Titanic, et un registre des thèmes pour ne jamais resservir les mêmes faits",
          ],
          tags: ["TypeScript", "React", "Remotion", "Node.js", "ElevenLabs", "Claude", "ffmpeg"],
        },
        {
          file: "Generateurs_Videos.exe",
          icon: "docGreen",
          title: "Générateurs de vidéos TikTok",
          org: "Vidéos 100 % générées par le code",
          date: "2026",
          summary: "Une famille de générateurs : une commande produit une vidéo verticale complète, prête à publier, sans retouche à la main.",
          bullets: [
            "Lanceur : interface web locale qui pilote tous les générateurs, avec file d'attente, progression en direct et galerie des vidéos produites",
            "Quiz animés : QCM sur les anime, les films et les séries, ou images floutées à deviner ; questions tirées d'un stock vérifié, visuels TheTVDB, voix de synthèse et montage Remotion",
            "Courses de billes : circuits aléatoires, physique déterministe (Rapier), rendu Three.js et réalisateur automatique qui choisit les plans",
            "Find Gus : cherche-et-trouve avec un personnage original et des sosies leurres, scènes générées et contrôlées automatiquement (Python)",
            "Créateur de musique : musiques de fond composées par le code (DawDreamer, synthé Surge XT), sans aucun échantillon externe, donc sans réclamation de droits",
          ],
          tags: ["TypeScript", "React", "Remotion", "Three.js", "Rapier", "Python", "Node.js"],
        },
        {
          file: "Recif_Infini.exe",
          icon: "docGreen",
          title: "Récif Infini : jeu Roblox",
          org: "Idle coopératif sous-marin",
          date: "2026",
          summary: "Un jeu de collection coopératif sur Roblox : 30 créatures marines à faire éclore et à élever, réparties sur 5 zones.",
          bullets: [
            "Architecture client / serveur en Luau : économie et équilibrage centralisés, services serveur (données, œufs, marées, boutique, cadeaux), interface côté client",
            "Sécurité : tirages, collecte et achats validés par le serveur, reçus d'achat traités une seule fois, verrou de session et sauvegarde régulière du profil",
            "Conformité : probabilités affichées sur chaque œuf, tirages jamais vendus contre de l'argent réel, objets aléatoires payants masqués là où la loi les restreint",
            "Outillage : synchronisation du code avec Roblox Studio (Rojo ou serveur HTTP local) et commandes de test réservées au Studio",
          ],
          tags: ["Luau", "Roblox Studio", "Rojo", "Python"],
        },
        {
          file: "Outils_Maison.exe",
          icon: "docGreen",
          title: "Outils maison : vidéo, son & streaming",
          org: "Windows · Android",
          date: "2026",
          summary: "Des outils écrits pour mes propres besoins, quand rien d'existant ne faisait exactement ce qu'il fallait.",
          bullets: [
            "S21 Cam : mon téléphone devient une webcam 4K en USB, avec décodage par la carte graphique et une régulation thermique qui baisse la qualité avant la surchauffe (Python, PySide6, scrcpy)",
            "MediaDrop : téléchargeur vidéo et audio portable (yt-dlp, ffmpeg) avec découpe, compression sous 10 Mo, fenêtre de bureau, ligne de commande et extension de navigateur",
            "OBS auto-capture : script qui crée une source audio pour chaque application qui joue du son, et la retire quand elle se ferme",
            "LiveChat : bot Discord qui affiche des memes en direct sur un overlay OBS (Node.js, WebSocket)",
            "Segra : dans ma version de ce logiciel libre d'enregistrement de parties, une vidéo par match pour League of Legends, Valorant et Rocket League (C#, React)",
            "Booster : application Android en Java qui pousse le volume au-delà du maximum du système",
          ],
          tags: ["Python", "PySide6", "C#", "Java (Android)", "Node.js", "OBS", "ffmpeg"],
        },
        {
          file: "CV_Chambre_98.exe",
          icon: "docGreen",
          title: "Ce CV en 3D !",
          date: "2026",
          summary: "Ma chambre en pixel art, un vieux PC, un OS rétro… vous êtes dedans.",
          bullets: ["Modélisation dans Blender", "Rendu Three.js pixelisé", "Sons synthétisés en WebAudio"],
          tags: ["Three.js", "Blender", "WebAudio"],
        },
      ],
    },

    {
      id: "hobbies",
      label: "Loisirs",
      icon: "gamepad",
      type: "folder",
      description: "Quand je ne code pas…",
      items: [
        {
          file: "Cinema.txt", icon: "doc", title: "Cinéma",
          summary: "Mes 3 films préférés : Blade Runner, Barry Lyndon et Les 7 Samouraïs.",
          photos: [
            { img: "assets/posters/blade_runner.png", full: "assets/posters/blade_runner_hd.webp", pixel: true, caption: "Blade Runner" },
            { img: "assets/posters/barry_lyndon.png", full: "assets/posters/barry_lyndon_hd.webp", pixel: true, caption: "Barry Lyndon" },
            { img: "assets/posters/sept_samourais.png", full: "assets/posters/sept_samourais_hd.webp", pixel: true, caption: "Les 7 Samouraïs" },
          ],
        },
        { file: "Velo.txt", icon: "doc", title: "Vélo", photos: [{ art: "bike", caption: "En selle" }, { art: "road", caption: "La route" }, { art: "map", caption: "L'itinéraire" }] },
        { file: "Basket-Ball.txt", icon: "doc", title: "Basket-Ball", photos: [{ art: "ball", caption: "Le ballon" }, { art: "hoop", caption: "Panier !" }, { art: "court", caption: "Le terrain" }] },
      ],
    },

    {
      id: "contact",
      label: "Contact",
      icon: "mail",
      type: "contact",
      links: [
        // adresse encodée (base64 de l'adresse à l'envers) : jamais en clair dans le code ni dans la page,
        // elle n'est reconstituée qu'au clic d'un visiteur (anti-aspiration par les robots)
        { label: "E-mail", email: "bW9jLmxpYW1nQGlkaGVtZHJhaGNpcA==" },
        { label: "LinkedIn", value: "linkedin.com/in/mehdi-pichard", href: "https://www.linkedin.com/in/mehdi-pichard" },
        { label: "GitHub", value: "github.com/Mehdi-Pic", href: "https://github.com/Mehdi-Pic" },
      ],
    },
  ],
};
