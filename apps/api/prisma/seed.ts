import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const providers = [
    {
      name: 'Server 1 (VidSrc)',
      slug: 'vidsrc',
      category: 'vod',
      movieTemplate: 'https://vidsrc.me/embed/movie/{id}',
      tvTemplate: 'https://vidsrc.me/embed/tv/{id}/{s}/{e}',
      rank: 1,
    },
    {
      name: 'Server 2 (VidLink Pro)',
      slug: 'vidlink',
      category: 'vod',
      movieTemplate: 'https://vidlink.pro/movie/{id}',
      tvTemplate: 'https://vidlink.pro/tv/{id}/{s}/{e}',
      rank: 2,
    },
    {
      name: 'Server 3 (2Embed)',
      slug: 'twoembed',
      category: 'vod',
      movieTemplate: 'https://www.2embed.cc/embed/{id}',
      tvTemplate: 'https://www.2embed.cc/embedtv/{id}&s={s}&e={e}',
      rank: 3,
    },
    {
      name: 'Server 4 (MultiEmbed)',
      slug: 'multiembed',
      category: 'vod',
      movieTemplate: 'https://multiembed.mov/directstream.php?video_id={id}',
      tvTemplate: 'https://multiembed.mov/directstream.php?video_id={id}&s={s}&e={e}',
      rank: 4,
    },
  ];

  for (const provider of providers) {
    await prisma.streamProvider.upsert({
      where: { slug: provider.slug },
      update: {},
      create: provider,
    });
  }
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
