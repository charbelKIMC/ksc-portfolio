// Contenu de secours du portfolio, au même format que la réponse de /api/content.
// Le site l'affiche si l'API ne répond pas, et « npm run db:setup » s'en sert pour remplir la base.
// Une fois la base en place, c'est l'espace administrateur qui fait foi : ce fichier n'est plus qu'une sauvegarde.
const FALLBACK = {
  profile: {
    givenNames: 'Sètondji',
    firstName: 'Charbel',
    lastName: 'Kinkpe',
    location: 'Parakou, Bénin',
    statusText: 'ouvert aux opportunités',
    available: true,
    intro: "Je crée des sites et des applications qui aident votre activité à être trouvée, à vendre et à mieux s'organiser.",
    subintro: "Site vitrine, boutique en ligne, application de gestion ou application mobile : je vous accompagne de l'idée à la mise en ligne, depuis Parakou, pour tout le Bénin et au-delà.",
    recruiterLine: 'Recruteur ? Développeur Full Stack & Cloud Native,',
    aboutTitle: 'Un développeur qui pense d’abord à votre activité',
    about: [
      "Titulaire d'une Licence en Systèmes Informatiques et Logiciels, je construis des solutions web et mobiles complètes, du design à la mise en production. Mon objectif n'est pas seulement d'écrire du code : c'est de livrer un outil que vos clients utilisent vraiment et qui fait avancer votre activité."
    ],
    goalLabel: 'Côté technique',
    goal: 'Full Stack & Cloud Native, avec une approche orientée produit, utilisateurs et résultats.',
    email: 'contact@charbelkinkpe.com',
    photoUrl: 'img/charbel.jpg',
    cvUrl: null,
    contactTitle: 'Un projet ou un poste ? Parlons-en.',
    contactSubtitle: 'Je réponds généralement dans la journée.',
    whatsapp: '2290169579942',
    whatsappMessage: "Bonjour Charbel, j'ai vu votre portfolio et j'aimerais parler d'un projet.",
    mailSubject: 'Demande de projet depuis votre portfolio',
    mailBody: "Bonjour Charbel, je m'appelle [nom]. J'ai un projet de [type de projet]. Mon besoin : [description]. Délai souhaité : [délai]. Merci de me recontacter."
  },

  // Projets : cartes de l'accueil (featured), page « Tous les projets » et page détails (#slug).
  // Un bouton démo ou code apparaît dès que demo ou code est renseigné.
  // status : 'in_progress' (En cours) ou 'done' (Terminé).
  projects: [
    {
      id: 'claimora', seed: 1, featured: true, title: 'Claimora', kind: 'SaaS · Web & mobile', status: 'in_progress', year: null,
      cats: ['SaaS', 'Web', 'Mobile', 'Personnel'],
      img: 'img/claimora.webp', logo: false,
      tag: 'Plateforme SaaS multi-tenant de gestion des réclamations clients',
      summary: "Centraliser, traiter et suivre les réclamations en toute conformité, pour plusieurs entreprises sur une seule plateforme.",
      about: [
        "Claimora permet aux entreprises de centraliser, traiter et suivre les réclamations de leurs clients dans un environnement sécurisé et conforme au RGPD.",
        "Chaque entreprise dispose de son propre espace isolé. Les clients, eux, utilisent un compte unique pour déposer une réclamation auprès de n'importe quelle entreprise abonnée."
      ],
      features: [
        "Multi-tenant : un espace isolé et sécurisé pour chaque entreprise",
        "Client unique : un compte commun pour toutes les entreprises abonnées",
        "Annuaire des entreprises pour trouver celle qui est concernée",
        "Tableau de bord en temps réel : volumes, statuts, satisfaction, évolution",
        "Notifications et rapports pour piloter le traitement",
        "Conformité RGPD : protection des données, consentement, traçabilité",
        "API et intégrations, accessible sur le web et sur mobile"
      ],
      stepsTitle: "Parcours d'une réclamation",
      steps: [
        { title: 'Recherche', text: "Le client trouve l'entreprise dans l'annuaire" },
        { title: 'Redirection', text: "Il accède à l'espace dédié de l'entreprise" },
        { title: 'Dépôt', text: 'Il dépose sa réclamation en quelques étapes' },
        { title: 'Traitement', text: "L'entreprise traite et suit la réclamation" },
        { title: 'Suivi', text: "Le client est notifié et suit l'avancement" }
      ],
      role: "Conception de l'architecture et développement full stack, de la base de données à l'interface utilisateur.",
      stack: ['Laravel', 'Vue.js', 'PostgreSQL', 'Flutter', 'Redis'],
      gallery: [{ src: 'img/claimora.webp', caption: "Tableau de bord entreprise, annuaire mobile et parcours d'une réclamation", logo: false }],
      facts: [
        { label: 'Type', value: 'SaaS multi-tenant · Web et mobile' },
        { label: 'Statut', value: 'En cours de développement' },
        { label: 'Rôle', value: 'Développeur Full Stack' }
      ],
      demo: null, code: null
    },
    {
      id: 'soko', seed: 2, featured: true, title: 'SOKO', kind: 'Fintech · Mobile', status: 'done', year: null,
      cats: ['Mobile', 'Fintech'],
      img: 'img/soko.webp', logo: false,
      tag: "Super-app fintech pensée pour l'Afrique de l'Ouest",
      summary: "Paiements, transferts, micro-crédit et épargne dans une seule application. Une app, tous vos besoins, toute la région.",
      about: [
        "SOKO est une super-app financière pensée pour l'Afrique de l'Ouest : paiements entre particuliers, transferts internationaux, micro-crédit et épargne réunis dans une seule application.",
        "Elle est conçue dans le respect des normes et réglementations de la BCEAO, pour des transactions sécurisées et fiables."
      ],
      features: [
        "Paiements entre particuliers (P2P)",
        "Transferts internationaux",
        "Micro-crédit avec score de crédit calculé par IA",
        "Épargne intelligente",
        "Recharge de crédit téléphonique et paiement de factures",
        "API marchands pour intégrer SOKO à une plateforme en quelques lignes de code",
        "Conformité aux normes de la BCEAO"
      ],
      stepsTitle: null, steps: [],
      role: null,
      stack: [],
      gallery: [{ src: 'img/soko.webp', caption: "Application mobile SOKO : solde, services, score de crédit et micro-crédit", logo: false }],
      facts: [
        { label: 'Type', value: 'Super-app fintech' },
        { label: 'Plateforme', value: 'Application mobile et API' },
        { label: 'Pays visés', value: "Bénin, Togo, Sénégal, Côte d'Ivoire, Mali…" }
      ],
      demo: null, code: null
    },
    {
      id: 'foodies', seed: 4, featured: true, title: 'Restaurant Foodies', kind: 'Commande en ligne · Web & mobile', status: 'done', year: null,
      cats: ['Web', 'Mobile'],
      img: 'img/foodies.webp', logo: false,
      tag: 'Vos plats préférés, livrés à votre porte en un clic',
      summary: "Commande en ligne pour un restaurant : menu par catégories, livraison, paiement sécurisé et suivi de commande.",
      about: [
        "Restaurant Foodies est une plateforme de commande en ligne : le client parcourt le menu, commande ses plats et se fait livrer chez lui.",
        "Le restaurant gère ses menus et ses réservations depuis une interface d'administration. Le service est accessible sur ordinateur et sur mobile."
      ],
      features: [
        "Menu par catégories : pizza, burgers, plats locaux, boissons, desserts",
        "Commande en ligne et suivi de commande",
        "Livraison rapide à domicile",
        "Paiement sécurisé avec plusieurs moyens de paiement",
        "Gestion des menus et des réservations",
        "Interface d'administration intuitive",
        "Site web et application mobile, prix en FCFA"
      ],
      stepsTitle: null, steps: [],
      role: null,
      stack: [],
      gallery: [
        { src: 'img/foodies.webp', caption: 'Site web et application mobile de commande', logo: false },
        { src: 'img/foodies-logo.webp', caption: 'Logo : « Commandez. Résistez. Savourez. »', logo: true }
      ],
      facts: [
        { label: 'Type', value: 'Commande et livraison en ligne' },
        { label: 'Supports', value: 'Web et mobile' }
      ],
      demo: null, code: null
    },
    {
      id: 'devhub', seed: 3, featured: true, title: 'DevHub', kind: 'Mémoire de Licence 3', status: 'done', year: '2026',
      cats: ['Web', 'Académique'],
      img: 'img/devhub-logo.jpg', logo: true,
      tag: 'Plateforme de mise en réseau pour développeurs juniors au Bénin',
      summary: "Collaborer, apprendre, progresser. Projet réalisé dans le cadre du mémoire de fin de cycle et d'un stage.",
      about: [
        "DevHub est une plateforme de mise en réseau pensée pour les développeurs juniors au Bénin, autour de trois idées : collaborer, apprendre et progresser.",
        "Le projet a été réalisé dans le cadre de mon mémoire de fin de Licence 3 en Systèmes Informatiques et Logiciels, et d'un stage."
      ],
      features: [
        "Mise en relation des développeurs juniors au Bénin",
        "Collaboration, apprentissage et progression entre pairs"
      ],
      stepsTitle: null, steps: [],
      role: "Conception et réalisation du projet dans le cadre du mémoire et du stage.",
      stack: [],
      gallery: [{ src: 'img/devhub-logo.jpg', caption: 'Logo DevHub : « Collaborer · Apprendre · Progresser »', logo: true }],
      facts: [
        { label: 'Type', value: 'Projet académique' },
        { label: 'Année', value: '2026' },
        { label: 'Cadre', value: 'Mémoire de Licence 3 et stage' }
      ],
      demo: null, code: null
    },
    {
      id: 'wifi-zone', seed: 5, featured: false, title: 'Wifi Zone', kind: 'Projet en cours', status: 'in_progress', year: null,
      cats: ['Personnel'],
      img: null, logo: false,
      tag: 'Projet en cours de développement',
      summary: "Je travaille actuellement sur ce projet. La présentation complète arrive bientôt.",
      about: ["Je travaille actuellement sur ce projet. Sa présentation complète, avec les visuels et les fonctionnalités, sera publiée prochainement."],
      features: [],
      stepsTitle: null, steps: [],
      role: null,
      stack: [],
      gallery: [],
      facts: [{ label: 'Statut', value: 'En cours de développement' }],
      demo: null, code: null
    }
  ],

  services: [
    { tag: 'Site vitrine', title: 'Être visible en ligne', description: 'Personne ne vous trouve sur internet ? Je crée un site professionnel, rapide et bien référencé sur Google, qui présente votre activité et vous apporte des contacts.', example: null },
    { tag: 'Boutique en ligne', title: 'Vendre en ligne', description: 'Vous voulez vendre vos produits même quand votre boutique est fermée ? Je mets en place une boutique en ligne claire, avec gestion des commandes et paiements adaptés à vos clients.', example: null },
    { tag: 'Application de gestion', title: 'Simplifier votre gestion', description: 'Vous gérez encore tout sur papier, Excel ou WhatsApp ? Je développe une application sur mesure pour suivre vos ventes, vos clients, vos réclamations ou vos équipes.', example: 'claimora' },
    { tag: 'Application mobile', title: 'Une application pour vos clients', description: 'Vous voulez être dans la poche de vos clients ? Je conçois des applications mobiles Android et iOS, belles et faciles à prendre en main.', example: null }
  ],

  // Dates au format AAAA-MM ; end: null = poste actuel. months : durée affichée et additionnée dans les chiffres clés.
  experiences: [
    {
      role: 'Développeur Full Stack · stage professionnel', company: 'DIGIT Consults SARL', location: 'Cotonou, Bénin',
      start: '2026-08', end: '2026-10', months: 3,
      tasks: [
        'Participation à la réalisation de StagePro, plateforme de gestion de stagiaires (Nuxt.js / Vue.js)',
        'Maintenance et nouvelles fonctionnalités sur mesure pour des sites clients WordPress'
      ]
    },
    {
      role: 'Développeur Web · stage académique', company: 'DIGIT Consults SARL', location: 'Cotonou, Bénin',
      start: '2026-02', end: '2026-05', months: 3,
      tasks: [
        "Développement et maintenance d'applications web",
        'Conception et intégration d\'interfaces utilisateur',
        'Développement de fonctionnalités CRUD'
      ]
    },
    {
      role: 'Stagiaire développeur', company: 'CABRO GROUP', location: 'Parakou, Bénin',
      start: '2025-06', end: '2025-08', months: 2,
      tasks: [
        'Conception et gestion de bases de données',
        'Intégration d\'interfaces pour application web et mobile',
        'Maintenance et correction de bugs'
      ]
    }
  ],

  // kind: 'tech' = compétences techniques (comptées dans les chiffres clés), 'soft' = savoir-être
  skillGroups: [
    { name: 'Front-end', kind: 'tech', skills: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React.js', 'Vue.js'] },
    { name: 'Back-end', kind: 'tech', skills: ['PHP', 'Laravel', 'Django', 'Node.js'] },
    { name: 'Mobile', kind: 'tech', skills: ['Flutter', 'Android (Java, XML)', 'React Native'] },
    { name: 'Bases de données', kind: 'tech', skills: ['MySQL', 'PostgreSQL', 'MongoDB'] },
    { name: 'Langages', kind: 'tech', skills: ['Python', 'Java', 'C', 'C++'] },
    { name: 'Outils', kind: 'tech', skills: ['Git & GitHub', 'VS Code', 'Android Studio', 'Figma'] },
    { name: 'Savoir-être', kind: 'soft', skills: ['Analyse et résolution de problèmes', 'Travail en équipe', 'Autonomie et rigueur', 'Gestion du temps et des priorités', 'Apprentissage continu', 'Communication écrite et orale', 'Adaptation aux nouvelles technologies'] }
  ],

  socials: [
    { label: 'WhatsApp', url: 'https://wa.me/2290169579942' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/setondji-charbel-kinkpe' },
    { label: 'GitHub', url: 'https://github.com/charbelKIMC' },
    { label: 'Portfolio', url: 'https://charbelkinkpe.com' }
  ]
};
