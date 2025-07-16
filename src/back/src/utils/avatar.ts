const defaultAvatars = [
  "/assets/icone/Demacia_Vice.webp",
  "/assets/icone/Garen.webp",
  "/assets/icone/Garen_Border.webp",
  "/assets/icone/Legendary_Handshake.webp",
  "/assets/icone/Lucian.webp",
  "/assets/icone/Lucian_Border.webp",
];

export function getRandomDefaultAvatar(): string {
  const idx = Math.floor(Math.random() * defaultAvatars.length);
  return defaultAvatars[idx];
}
