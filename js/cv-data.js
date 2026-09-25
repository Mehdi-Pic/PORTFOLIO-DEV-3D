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
//   - "contact" → ouvre un carnet d'adresses avec `links`
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
    cvFile: "assets/CV_Mehdi_PICHARD.docx",
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
          file: "CV_Chambre_98.exe",
          icon: "docGreen",
          title: "Ce CV en 3D !",
          date: "2026",
          summary: "Une chambre d'ado en pixel art, un vieux PC, un OS rétro… vous êtes dedans.",
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
          web: { label: "Mon letterboxd", url: "https://boxd.it/bwunj" },
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
        { label: "E-mail", value: "adresse dans le carnet de contact du site", href: "https://mehdi-pic.github.io/PORTFOLIO-DEV-3D/" },
        { label: "LinkedIn", value: "linkedin.com/in/mehdi-pichard", href: "https://www.linkedin.com/in/mehdi-pichard" },
        { label: "GitHub", value: "github.com/Mehdi-Pic", href: "https://github.com/Mehdi-Pic" },
      ],
    },
  ],
};
