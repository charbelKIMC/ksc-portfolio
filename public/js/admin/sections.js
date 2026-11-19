// Sections de l'admin : champs de chaque formulaire et présentation des listes.
// Les noms des champs correspondent à ceux de l'API (lib/admin.js).

const IMAGE_HELP = 'Choisis une image sur ton appareil (JPG, PNG…) : elle est réduite et convertie en WebP automatiquement.';

export const SECTIONS = {
  profile: {
    title: 'Profil',
    singleton: true,
    groups: [
      {
        legend: 'En-tête',
        fields: [
          { name: 'givenNames', label: 'Prénoms (au-dessus du nom)', required: true },
          { name: 'firstName', label: 'Prénom affiché', required: true },
          { name: 'lastName', label: 'Nom', required: true },
          { name: 'intro', label: 'Accroche', type: 'textarea', help: 'La phrase principale pour tes clients. Mets un passage entre **deux astérisques** pour l\'écrire en gras.' },
          { name: 'subintro', label: 'Ligne de soutien', type: 'textarea', help: 'Phrase plus petite sous l\'accroche.' },
          { name: 'recruiterLine', label: 'Ligne recruteur', wide: true, placeholder: 'Recruteur ? Développeur Full Stack & Cloud Native,', help: 'Suivie du lien « voir mon parcours ». Laisse vide pour ne rien afficher.' },
          { name: 'photoUrl', label: 'Photo', type: 'image', folder: 'profile', maxWidth: 1000, help: IMAGE_HELP }
        ]
      },
      {
        legend: 'À propos',
        fields: [
          { name: 'aboutTitle', label: 'Titre', wide: true },
          { name: 'about', label: 'Texte', type: 'lines', rows: 6, help: 'Un paragraphe par ligne.' },
          { name: 'goalLabel', label: 'Titre de l\'encadré vert', placeholder: 'Côté technique' },
          { name: 'goal', label: 'Texte de l\'encadré vert', type: 'textarea' }
        ]
      },
      {
        legend: 'Contact',
        fields: [
          { name: 'contactTitle', label: 'Titre de la section', wide: true },
          { name: 'contactSubtitle', label: 'Sous-titre', wide: true, placeholder: 'Je réponds généralement dans la journée.' },
          { name: 'email', label: 'E-mail affiché', type: 'email', required: true },
          { name: 'cvUrl', label: 'CV (PDF)', type: 'file', folder: 'documents', help: 'PDF de 4 Mo maximum. Laisse vide si tu n\'en mets pas.' }
        ]
      },
      {
        legend: 'WhatsApp et e-mail préremplis',
        intro: 'Utilisés par les boutons « Discuter de mon projet », « Parlons de votre besoin », « Écrire sur WhatsApp », « Envoyer un e-mail » et le bouton WhatsApp flottant.',
        fields: [
          { name: 'whatsapp', label: 'Numéro WhatsApp', placeholder: '2290169579942', help: 'Format international, chiffres seulement : 229 puis le numéro. Vide : boutons WhatsApp masqués.' },
          { name: 'whatsappMessage', label: 'Message WhatsApp prérempli', type: 'textarea' },
          { name: 'mailSubject', label: 'Objet de l\'e-mail', wide: true },
          { name: 'mailBody', label: 'Texte de l\'e-mail', type: 'textarea', rows: 4 }
        ]
      }
    ]
  },

  projects: {
    title: 'Projets',
    one: 'un projet',
    ordered: true,
    empty: { status: 'in_progress', published: true, featured: false, cats: [], stack: [], about: [], features: [], steps: [], facts: [], gallery: [] },
    summary: p => ({
      title: p.title,
      sub: [p.kind, p.cats.join(' / ')].filter(Boolean).join(' · '),
      badges: [!p.published && 'Brouillon', p.featured && 'À la une', p.status === 'in_progress' ? 'En cours' : 'Terminé'].filter(Boolean),
      link: p.published ? `/projets/${p.slug}` : null
    }),
    groups: [
      {
        legend: 'Essentiel',
        fields: [
          { name: 'title', label: 'Titre', required: true },
          { name: 'slug', label: 'Adresse de la page', required: true, help: 'charbelkinkpe.com/#adresse — remplie à partir du titre.' },
          { name: 'kind', label: 'Type', placeholder: 'SaaS · Web & mobile' },
          { name: 'status', label: 'Statut', type: 'select', options: [['in_progress', 'En cours'], ['done', 'Terminé']], help: 'Affiché sur la carte et sur la page du projet.' },
          { name: 'year', label: 'Année', placeholder: '2026' },
          { name: 'cats', label: 'Catégories (filtres)', type: 'tags', placeholder: 'Web, Mobile, Personnel', help: 'Séparées par des virgules.' },
          { name: 'published', label: 'Publié (visible sur le site)', type: 'checkbox' },
          { name: 'featured', label: 'À la une (affiché sur l\'accueil)', type: 'checkbox' }
        ]
      },
      {
        legend: 'Carte et page du projet',
        fields: [
          { name: 'tag', label: 'Accroche', wide: true },
          { name: 'summary', label: 'Résumé (carte)', type: 'textarea', help: 'Trois lignes maximum sur la carte.' },
          { name: 'about', label: 'Le projet', type: 'lines', rows: 5, help: 'Un paragraphe par ligne.' },
          { name: 'features', label: 'Fonctionnalités', type: 'lines', rows: 6, help: 'Une fonctionnalité par ligne.' },
          { name: 'role', label: 'Mon rôle', type: 'textarea' },
          { name: 'stack', label: 'Technologies', type: 'tags', placeholder: 'Laravel, Vue.js, PostgreSQL', wide: true },
          { name: 'facts', label: 'Infos (colonne de droite)', type: 'rows', addLabel: 'Ajouter une info',
            columns: [{ name: 'label', label: 'Libellé', placeholder: 'Type' }, { name: 'value', label: 'Valeur', placeholder: 'SaaS multi-tenant' }] }
        ]
      },
      {
        legend: 'Étapes (facultatif)',
        intro: 'Un parcours en étapes numérotées, comme « Parcours d\'une réclamation » pour Claimora.',
        fields: [
          { name: 'stepsTitle', label: 'Titre de la partie', wide: true },
          { name: 'steps', label: 'Étapes', type: 'rows', addLabel: 'Ajouter une étape',
            columns: [{ name: 'title', label: 'Étape', placeholder: 'Recherche' }, { name: 'text', label: 'Description' }] }
        ]
      },
      {
        legend: 'Images',
        fields: [
          { name: 'img', label: 'Image de la carte', type: 'image', folder: 'projects', help: IMAGE_HELP },
          { name: 'logo', label: 'Cette image est un logo (affichée en entier, sans recadrage)', type: 'checkbox' },
          { name: 'gallery', label: 'Visuels de la page', type: 'rows', addLabel: 'Ajouter un visuel',
            help: 'Affichés en grille sur la page du projet. Tu peux choisir plusieurs images d\'un coup : une ligne est créée pour chacune.',
            columns: [{ name: 'src', label: 'Image', type: 'image', folder: 'projects', multiple: true }, { name: 'logo', label: 'Logo', type: 'checkbox' }] }
        ]
      },
      {
        legend: 'Liens',
        fields: [
          { name: 'demo', label: 'Démo en ligne', type: 'url', placeholder: 'https://…', help: 'Vide : « Démo bientôt disponible ».' },
          { name: 'code', label: 'Code source', type: 'url', placeholder: 'https://github.com/…' }
        ]
      }
    ]
  },

  services: {
    title: 'Services',
    one: 'un service',
    ordered: true,
    empty: {},
    summary: s => ({ title: s.title, sub: s.tag, badges: [] }),
    groups: [{
      legend: 'Service',
      fields: [
        { name: 'title', label: 'Titre', required: true },
        { name: 'tag', label: 'Étiquette', placeholder: 'Web' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'example', label: 'Exemple (projet)', placeholder: 'claimora', help: 'Adresse d\'un projet : affiche « Exemple : Claimora » avec un lien vers sa page. Laisse vide sinon.' }
      ]
    }]
  },

  experiences: {
    title: 'Expériences',
    one: 'une expérience',
    note: 'Triées automatiquement, la plus récente en premier.',
    empty: { tasks: [] },
    summary: e => ({ title: e.role, sub: `${e.company} · ${e.start}${e.end ? ` → ${e.end}` : ' → aujourd\'hui'}`, badges: [] }),
    groups: [{
      legend: 'Expérience',
      fields: [
        { name: 'role', label: 'Poste', required: true, placeholder: 'Développeur Full Stack · stage professionnel' },
        { name: 'company', label: 'Entreprise', required: true },
        { name: 'location', label: 'Lieu', placeholder: 'Cotonou, Bénin' },
        { name: 'months', label: 'Durée (mois)', type: 'number', required: true, help: 'Additionnée dans le chiffre clé « mois d\'expérience ».' },
        { name: 'start', label: 'Début', type: 'month', required: true },
        { name: 'end', label: 'Fin', type: 'month', help: 'Vide si c\'est ton poste actuel.' },
        { name: 'tasks', label: 'Missions', type: 'lines', rows: 5, help: 'Une mission par ligne.' }
      ]
    }]
  },

  skills: {
    title: 'Compétences',
    one: 'un groupe',
    ordered: true,
    empty: { kind: 'tech', skills: [] },
    summary: g => ({ title: g.name, sub: g.skills.join(', '), badges: [g.kind === 'soft' ? 'Savoir-être' : `${g.skills.length} technos`] }),
    groups: [{
      legend: 'Groupe de compétences',
      fields: [
        { name: 'name', label: 'Nom du groupe', required: true, placeholder: 'Front-end' },
        { name: 'kind', label: 'Type', type: 'select', options: [['tech', 'Technique (compté dans les chiffres clés)'], ['soft', 'Savoir-être']] },
        { name: 'skills', label: 'Compétences', type: 'lines', rows: 8, help: 'Une compétence par ligne.' }
      ]
    }]
  },

  socials: {
    title: 'Contact',
    one: 'un lien',
    ordered: true,
    note: 'Liens affichés sous ton e-mail. L\'e-mail se modifie dans Profil.',
    empty: {},
    summary: s => ({ title: s.label, sub: s.url, badges: [] }),
    groups: [{
      legend: 'Lien',
      fields: [
        { name: 'label', label: 'Texte affiché', required: true, placeholder: 'linkedin.com/in/…' },
        { name: 'url', label: 'Adresse', required: true, placeholder: 'https://…', help: 'https://…, mailto:… ou tel:…' }
      ]
    }]
  }
};
