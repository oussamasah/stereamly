import { notFound } from 'next/navigation';
import { AdminNav } from '../../../../components/admin-nav';
import { Header } from '../../../../components/header';
import { isLocale } from '../../../../i18n';

const terms = [
  ['DRAFT / Brouillon', 'Enregistré mais pas encore visible par les utilisateurs.'],
  ['READY', 'Source contrôlée et prête à être activée.'],
  ['Import', 'Lecture d’une source et préparation des différences.'],
  ['PREVIEW', 'Aperçu des changements avant leur application.'],
  ['Mapping', 'Association entre une chaîne XMLTV et une chaîne Streamly.'],
  ['EPG / XMLTV', 'Grille horaire des programmes et son format d’échange.'],
  ['Slug', 'Identifiant lisible utilisé dans une URL.'],
] as const;

export default async function AdminHelp({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <main className="shell"><Header locale={locale}/><AdminNav locale={locale} current="help"/>
    <div className="admin-heading"><p className="eyebrow">ASSISTANCE</p><h1>Guide administrateur</h1><p className="lead">Les procédures essentielles pour administrer Streamly sans publier ou supprimer du contenu par erreur.</p></div>
    <nav className="help-index" aria-label="Sommaire"><a href="#workflow">Parcours recommandé</a><a href="#sources">Sources et M3U</a><a href="#imports">Imports</a><a href="#catalogue">Publication</a><a href="#glossary">Glossaire</a></nav>
    <div className="help-layout">
      <section className="card" id="workflow"><p className="eyebrow">01</p><h2>Parcours recommandé</h2><ol><li>Ajouter puis tester une source.</li><li>Activer uniquement une source au statut <code>READY</code>.</li><li>Lancer l’import et contrôler son aperçu.</li><li>Appliquer les éléments sélectionnés en brouillon.</li><li>Vérifier les métadonnées dans le catalogue.</li><li>Publier seulement après validation.</li></ol></section>
      <section className="card" id="sources"><p className="eyebrow">02</p><h2>Sources et fichiers M3U</h2><p>Une source M3U peut être ajoutée depuis une URL ou un fichier local <code>.m3u</code>/<code>.m3u8</code> de 10 Mo maximum.</p><ol><li>Choisissez <strong>M3U</strong>.</li><li>Sélectionnez <strong>Téléverser un fichier</strong>.</li><li>Donnez un nom et choisissez le fichier.</li><li>Téléversez, activez la source, puis ouvrez Imports.</li></ol><p className="help-note">Le fichier doit commencer par <code>#EXTM3U</code> et contenir une entrée <code>#EXTINF</code>. Son contenu est stocké chiffré.</p></section>
      <section className="card" id="imports"><p className="eyebrow">03</p><h2>Contrôler un import</h2><p><code>ADD</code> ajoute, <code>UPDATE</code> actualise, <code>REMOVE</code> désactive et <code>UNCHANGED</code> ne change rien. Les éléments <code>CONFLICT</code> et <code>EXCLUDED</code> ne sont pas appliqués automatiquement.</p><p><strong>Appliquer en brouillon</strong> ne publie jamais directement le contenu.</p></section>
      <section className="card" id="catalogue"><p className="eyebrow">04</p><h2>Publier avec prudence</h2><p><strong>Archiver</strong> masque sans supprimer et <strong>Restaurer</strong> replace en brouillon. Vérifiez les titres, images, genres, droits et territoires avant publication.</p></section>
      <section className="card help-wide" id="glossary"><p className="eyebrow">05</p><h2>Glossaire</h2><dl>{terms.map(([term, definition]) => <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl></section>
      <section className="card help-wide"><p className="eyebrow">ERREURS</p><h2>Si une action est refusée</h2><ul><li><code>AUTHENTICATION_REQUIRED</code> : reconnectez-vous.</li><li><code>INSUFFICIENT_PERMISSION</code> : les sources exigent le rôle <code>TECHNICAL_ADMIN</code> ou <code>SUPER_ADMIN</code>.</li><li>Aucun bouton Importer : la source doit être activée et <code>READY</code>.</li><li>Contenu importé invisible : contrôlez puis publiez son brouillon dans Catalogue.</li></ul></section>
    </div>
  </main>;
}
