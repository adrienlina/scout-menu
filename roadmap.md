# Roadmap

## Transverse / technique
- [x] Signup & login
- [x] API cloud (Supabase)
- [ ] API hébergée & managée

## Menus
### v0 :white_check_mark:
- [x] Créer, modifier, supprimer un menu
- [x] Ajouter/modifier/supprimer des ingrédients (nom, quantité, unité : g, kg, ml, L, pièce)
- [x] Définir le type de repas (Petit-déjeuner, Déjeuner/Dîner, Goûter)
- [x] Partager un menu (privé / public)
- [x] Filtrer les menus par type de repas, propriétaire (mes menus, standards, partagés)
- [x] Rechercher des menus partagés par nom de créateur
### v1 :bulb:
- [ ] Rich-text editor pour le contenu du menu / la recette
- [ ] Pouvoir visualiser les menus publics sans avoir à créer de compte
- [ ] Ajouter un niveau de difficulté (préparation, cuisson) ainsi que de temps
- [ ] Importer une vingtaine de menus de base plus intéressants

## Camps
### v0 :white_check_mark:
- [x] Créer, modifier, supprimer un camp (nom, dates, nombre de participants)
- [x] Planifier les repas par jour et type de repas (grille de menus)
- [x] Glisser-déposer les menus dans la grille
- [x] Gérer les participants par tranche d'âge (Oranges, Bleus, Rouges, Adultes) avec multiplicateurs de portions
- [x] Propager automatiquement la répartition du premier jour aux jours suivants
- [x] Partager un camp avec d'autres utilisateurs (par email)
- [x] Exporter la grille de menus et les ingrédients en CSV

## Courses / Stock
### v0 :construction:
- [x] Créer des listes de courses (sélection par repas, par jour, ou toutes)
- [x] Visualiser une liste de courses par ingrédient agrégé ou par jour/menu
- [x] Cocher les articles d'une liste de courses en temps réel (synchronisation multi-utilisateurs)
- [x] Suivre le stock : saisir les quantités réellement utilisées par repas
- [ ] Permettre d'indiquer la quantité de gâchis d'un repas dans un camp
### v1 :bulb:
- [ ] Permettre de rassembler les ingrédients de plusieurs menus, notamment dans le stock

## Bilan carbone
### v0 :construction:
- [x] Importer & visualiser Agribalyse
- [x] Permettre d'associer un ingrédient à une entrée Agribalyse, et le multiplicateur
- [x] Afficher les émissions d'un menu
- [x] Afficher les émissions d'un repas (pour un camp)
- [x] Afficher les émissions d'un camp
- [ ] Ajouter un test E2E
- [ ] Ajouter un graphe "Total du camp"
### v1 :bulb:
- [ ] Ajouter un "à propos" sur Agribalyse
- [ ] Mettre les émissions d'un menu en perspective avec des menus similaires / de référence
- [ ] Améliorer les graphes de visualisation d'un camp
- [ ] Utiliser les familles d'ingrédient Agribalyse pour pouvoir regrouper les aliments
- [ ] Faire l'import Agribalyse dans une commande dédiée, et pas dans le front.


## Budget
### v0 :bulb:
- [ ] Intégrer une base de données d'ingrédients ?
- [ ] Trouver / mettre des ordres de grandeur de coûts par ingrédient
- [ ] Afficher le coût approximatif d'un menu par portion
- [ ] Afficher le coût approximatif d'un repas dans un camp (côut menu x nombre de portions)

## Nutrition
### v0 :bulb:
- [ ] Trouver la meilleure base de données de nutrition par aliment (idées : CIQUAL, NutriScore, Yuka open-source ?)
- [ ] Importer/connecter la BDD nutritionnelle
- [ ] Dans un menu, permettre de lier un ingrédient à une ligne BBD nutritionnelle
- [ ] Dans un menu, afficher le bilan nutritionnel par rapport aux 
- [ ] Dans un jour de camp, afficher le bilan nutritionnel (par tr)

## Intégration SGDF
### v0 :bulb:
- [ ] Permettre le SSO avec le compte SGDF, en optionnel
- [ ] Permettre de chercher son camp monprojet et de le lier à un camp
- [ ] Permettre d'envoyer sa grille de menus sur monprojet
- [ ] Gestion des erreurs (pbs de dates, permissions, etc)
