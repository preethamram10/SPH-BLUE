export interface DietCondition {
  id: string;
  name: string;
  category: "digestive" | "deficiency" | "metabolic";
  badge: string;
  foodsToEat: string[];
  foodsToAvoid: string[];
  emptyStomachDrink: string;
  bedtimeDrink: string;
  specialNote: string;
}

export const DIET_CONDITIONS: DietCondition[] = [
  // 1. Digestive & Gut
  {
    id: "gastritis",
    name: "Gastritis",
    category: "digestive",
    badge: "Gut Health",
    foodsToEat: [
      "Tender coconut water (empty stomach)",
      "Ripe sweet papaya & stewed apples",
      "Cooked oats porridge with almond milk",
      "Soft boiled bottle gourd (lauki), ridge gourd (turai), and pumpkin",
      "Soaked sabja (basil) seeds in lukewarm water",
      "Moong dal khichdi with a drop of A2 cow ghee"
    ],
    foodsToAvoid: [
      "Red chillies, hot peppers, and excess garam masala",
      "Deep fried snacks and oily street foods",
      "Citric fruits (lemons, raw oranges) on an empty stomach",
      "Caffeine, black tea, and carbonated fizzy drinks",
      "Raw onion, raw garlic, and synthetic vinegar"
    ],
    emptyStomachDrink: "Warm water with 1 tsp soaked sabja seeds or tender coconut water",
    bedtimeDrink: "Lukewarm fennel (saunf) infused water",
    specialNote: "Eat at small, regular intervals. Never stay empty stomach for more than 3.5 hours."
  },
  {
    id: "ibs_ibd",
    name: "IBS / IBD",
    category: "digestive",
    badge: "Bowel Health",
    foodsToEat: [
      "Low-FODMAP easily digestible cooked foods",
      "Steamed zucchini, carrots, spinach, and bottle gourd",
      "Well-cooked white rice or jasmine rice porridge",
      "Strained yellow moong dal water",
      "Freshly churned thin buttermilk with roasted cumin (jeera) powder",
      "Steamed banana / ripe firm banana"
    ],
    foodsToAvoid: [
      "Raw salads and coarse uncooked fibrous vegetables",
      "Excess gluten, wheat bran, and bakery bread",
      "Dairy milk, condensed milk, and heavy cream",
      "High FODMAP items: onions, garlic, mushrooms, cauliflower, kidney beans",
      "Artificial sweeteners (sorbitol, maltitol, aspartame)"
    ],
    emptyStomachDrink: "Lukewarm jeera-coriander water (strained)",
    bedtimeDrink: "Warm water with 1/2 tsp roasted cumin powder",
    specialNote: "Keep food well-chewed and warm. Avoid ice-cold beverages entirely."
  },
  {
    id: "sibo",
    name: "SIBO (Small Intestinal Bacterial Overgrowth)",
    category: "digestive",
    badge: "Gut Flora",
    foodsToEat: [
      "Easily absorbable low-fermentable foods",
      "Steamed squash, carrots, and cucumber",
      "Cooked white rice, quinoa, and light dal soup",
      "Herbal peppermint and ginger tea",
      "Moderate portions of clean lean protein and cooked paneer"
    ],
    foodsToAvoid: [
      "Fermented prebiotic fiber supplements that trigger bloating",
      "High fructan foods (wheat, garlic, onion, rye)",
      "High lactose milk and soft cheeses",
      "Legumes and beans without overnight pressure cooking",
      "Refined sugar and high fructose corn syrup"
    ],
    emptyStomachDrink: "Warm ginger-infused water with a drop of fresh lemon",
    bedtimeDrink: "Chamomile or peppermint tea",
    specialNote: "Space meals 4 hours apart to activate the migrating motor complex (MMC)."
  },
  {
    id: "bloating",
    name: "Bloating",
    category: "digestive",
    badge: "Digestion",
    foodsToEat: [
      "Fennel (saunf) and ajwain tea after meals",
      "Ginger infused warm water",
      "Cooked pumpkin, ash gourd juice, bottle gourd",
      "Soaked chia seeds",
      "Warm vegetable broths and cumin spiced soups"
    ],
    foodsToAvoid: [
      "Carbonated soda, sparkling water, and cold sodas",
      "Chewing gums and drinking through straws (causes air swallow)",
      "Raw cabbage, broccoli, cauliflower, and radish",
      "Unsoaked lentils and canned legumes",
      "Drinking large glasses of water during or immediately after meals"
    ],
    emptyStomachDrink: "Warm water boiled with 1/2 tsp ajwain (carom) and 1/2 tsp saunf",
    bedtimeDrink: "Warm fennel water",
    specialNote: "Eat slowly without rushing and chew each bite 20-30 times."
  },
  {
    id: "acidity",
    name: "Acidity / GERD",
    category: "digestive",
    badge: "Acid Balance",
    foodsToEat: [
      "Fresh coconut water and alkaline water",
      "Soaked almonds (peeled)",
      "Cold A2 cow milk (1-2 sips if acute burning)",
      "Oats porridge, barley water, and ripe banana",
      "Boiled vegetables, coriander leaf juice"
    ],
    foodsToAvoid: [
      "Late-night heavy oily dinners",
      "Tomato purees, ketchup, and citric sauces",
      "Strong black coffee, tea, and dark chocolate",
      "Tamarind, raw mango, and spicy pickles",
      "Lying down immediately after eating"
    ],
    emptyStomachDrink: "Fresh tender coconut water or aloe vera juice in room temperature water",
    bedtimeDrink: "Lukewarm coriander seed infusion (dhaniya water)",
    specialNote: "Elevate head of bed by 15 degrees. Dinner must be finished at least 2.5 to 3 hours before sleep."
  },
  {
    id: "piles",
    name: "Piles (Hemorrhoids / Fissures)",
    category: "digestive",
    badge: "Colon Health",
    foodsToEat: [
      "High natural soluble fiber foods (papaya, soaked figs/anjeer, prunes)",
      "Isabgol (psyllium husk) 1 tbsp in lukewarm water at bedtime",
      "Ash gourd (petha) soup and bottle gourd curry",
      "Flaxseeds (ground) 1 tsp daily with warm water",
      "Hydration: Minimum 3 to 3.5 liters of clean warm water daily"
    ],
    foodsToAvoid: [
      "Red chilli powder, green chillies, and black pepper excess",
      "Dry roasted salty nuts and deep fried savories (samosa, chips)",
      "White flour (maida), biscuits, and bakery puff pastry",
      "Straining during defecation and prolonged toilet sitting",
      "Heavy red meat and unrefined astringent astringents"
    ],
    emptyStomachDrink: "Warm water with 2 soaked figs (anjeer) and 4 black raisins",
    bedtimeDrink: "1 glass lukewarm water with 1 tbsp Isabgol (psyllium husk)",
    specialNote: "Maintain soft stool consistency. Never suppress natural bowel urges."
  },

  // 2. Nutritional Deficiencies
  {
    id: "sodium",
    name: "Sodium Balance",
    category: "deficiency",
    badge: "Electrolyte",
    foodsToEat: [
      "Pink Himalayan rock salt (sendha namak) in measured quantity",
      "Tender coconut water and lemon salt water",
      "Natural celery, carrots, spinach broths",
      "Fresh vegetable soups with pinch of rock salt"
    ],
    foodsToAvoid: [
      "Ultra-processed packaged chips, instant noodles, and preserved meats",
      "Excess table salt added over raw salads",
      "Extreme zero-salt fads unless clinically restricted"
    ],
    emptyStomachDrink: "Warm water with a pinch of rock salt and 2 drops of fresh lemon",
    bedtimeDrink: "Plain lukewarm water",
    specialNote: "Maintain proper electrolyte balance, especially in warm climates or active sweating."
  },
  {
    id: "protein",
    name: "Protein Deficiency",
    category: "deficiency",
    badge: "Muscle & Tissue",
    foodsToEat: [
      "Sprouted green moong and mixed lentil chilla",
      "Fresh paneer (cottage cheese) or organic tofu",
      "Roasted chana (Bengal gram) and sattu drink",
      "Boiled eggs (egg whites + yolk as tolerated)",
      "Pumpkin seeds, hemp seeds, and chia seeds",
      "Dal soups (masoor, toor, moong) with every major meal"
    ],
    foodsToAvoid: [
      "Synthetic protein bars packed with maltitol and palm oil",
      "Skipping protein at breakfast",
      "Excess fried protein (pakoras, fried paneer)"
    ],
    emptyStomachDrink: "Sattu water (1 tbsp sattu in warm water with roasted jeera) or chia water",
    bedtimeDrink: "Warm almond milk or turmeric A2 milk",
    specialNote: "Distribute protein intake evenly across breakfast, lunch, and dinner (20-25g per meal)."
  },
  {
    id: "magnesium",
    name: "Magnesium Deficiency",
    category: "deficiency",
    badge: "Nerve & Muscle",
    foodsToEat: [
      "Soaked pumpkin seeds and sunflower seeds (1-2 tbsp daily)",
      "Dark green leafy vegetables (spinach, moringa leaves)",
      "Dark chocolate (85%+ pure cocoa) in moderation",
      "Soaked almonds and cashews",
      "Cooked black beans and whole oats"
    ],
    foodsToAvoid: [
      "Excess refined sugar and sodas which deplete magnesium",
      "Alcohol and chronic heavy caffeine",
      "Ultra-processed frozen ready meals"
    ],
    emptyStomachDrink: "Warm water with 1 tbsp soaked chia and pumpkin seed powder",
    bedtimeDrink: "Warm chamomile tea or warm milk with pinch of nutmeg (magnesium relaxer)",
    specialNote: "Magnesium supports nervous relaxation, relieves muscle cramps, and improves restorative sleep."
  },
  {
    id: "zinc",
    name: "Zinc Deficiency",
    category: "deficiency",
    badge: "Immunity & Skin",
    foodsToEat: [
      "Raw or lightly roasted pumpkin seeds and watermelon seeds",
      "Sprouted legumes and chickpeas",
      "Mushrooms and whole sesame seeds (til)",
      "Nuts (cashews, walnuts, almonds)",
      "Whole wheat germ and quinoa"
    ],
    foodsToAvoid: [
      "Excess phytates from unsoaked, unsprouted raw grains",
      "High alcohol intake which blocks zinc absorption",
      "Refined grain flours stripped of germ"
    ],
    emptyStomachDrink: "Warm water with 1 tsp soaked sesame seeds and chia seeds",
    bedtimeDrink: "Warm almond milk with pinch of turmeric",
    specialNote: "Soak nuts and legumes overnight to break down phytates and optimize zinc bio-availability."
  },
  {
    id: "iron",
    name: "Iron Deficiency (Anemia)",
    category: "deficiency",
    badge: "Hemoglobin",
    foodsToEat: [
      "Moringa (drumstick) leaf soup and powder",
      "Cooked beetroot, pomegranate, and dark black raisins (soaked)",
      "Black dates and jaggery with roasted chana",
      "Spinach and fenugreek (methi) cooked in cast iron cookware",
      "Vitamin C rich amla (Indian gooseberry) to multiply iron absorption"
    ],
    foodsToAvoid: [
      "Drinking black tea or coffee 1 hour before or after meals (tannins block iron)",
      "Taking calcium supplements or heavy milk directly with iron-rich meals",
      "Unfermented soy isolate and excess bran"
    ],
    emptyStomachDrink: "Warm water with 1 tsp pure amla juice + 4 soaked black raisins",
    bedtimeDrink: "Warm milk with 2 crushed black dates",
    specialNote: "Always pair plant iron (non-heme) with Vitamin C (amla or lemon) for 3x higher absorption."
  },
  {
    id: "calcium",
    name: "Calcium Deficiency",
    category: "deficiency",
    badge: "Bone & Teeth",
    foodsToEat: [
      "Ragi (finger millet) porridge, roti, or idli",
      "White and black sesame seeds (til laddu / powder)",
      "A2 cow curd, buttermilk, and soft paneer",
      "Tofu and fortified soy/almond milk",
      "Dark leafy greens (bok choy, mustard greens, moringa)"
    ],
    foodsToAvoid: [
      "Carbonated colas and fizzy drinks (phosphoric acid leaches calcium from bones)",
      "Excess high-sodium junk foods",
      "Smoking and excessive caffeine"
    ],
    emptyStomachDrink: "Ragi malt cooked in water/milk with a hint of jaggery",
    bedtimeDrink: "Warm A2 cow milk with a pinch of turmeric and cardamom",
    specialNote: "Pair calcium intake with 15-20 minutes of morning sun exposure for essential Vitamin D synthesis."
  },
  {
    id: "manganese",
    name: "Manganese Deficiency",
    category: "deficiency",
    badge: "Enzyme Cofactor",
    foodsToEat: [
      "Whole grain oats, brown rice, and buckwheat",
      "Pecans, hazelnuts, and walnuts",
      "Pineapple (fresh slices) and blueberries",
      "Spinach and sweet potatoes",
      "Clove and cinnamon spices in cooking"
    ],
    foodsToAvoid: [
      "Highly milled white flour and white sugar",
      "Ultra-processed pre-packaged bakery goods"
    ],
    emptyStomachDrink: "Warm water with a pinch of cinnamon powder",
    bedtimeDrink: "Warm water or light herbal tea",
    specialNote: "Manganese activates enzymes for antioxidant defense (SOD) and cartilage formation."
  },
  {
    id: "phosphorus",
    name: "Phosphorus Balance",
    category: "deficiency",
    badge: "Cellular Energy",
    foodsToEat: [
      "Lentils, chickpeas, and kidney beans",
      "Pumpkin seeds and sunflower seeds",
      "A2 dairy (curd, paneer, milk)",
      "Eggs and whole grains (quinoa, millet)"
    ],
    foodsToAvoid: [
      "Inorganic phosphate additives found in processed sodas, sausages, and processed cheeses",
      "Instant noodles and packet soup mixes"
    ],
    emptyStomachDrink: "Lukewarm water with soaked flaxseed powder",
    bedtimeDrink: "Warm golden turmeric milk",
    specialNote: "Natural organic phosphorus from whole foods supports cellular ATP energy production."
  },
  {
    id: "vitamin_k",
    name: "Vitamin - K",
    category: "deficiency",
    badge: "Coagulation & Bone",
    foodsToEat: [
      "Kale, spinach, Swiss chard, and mustard greens",
      "Broccoli, Brussels sprouts, and green cabbage (lightly steamed)",
      "Fermented curd / yogurt and natto",
      "Avocado, kiwi, and green peas",
      "Cold-pressed virgin olive oil and grass-fed A2 ghee"
    ],
    foodsToAvoid: [
      "Hydrogenated trans fats and margarine",
      "Uncontrolled changes in leafy greens if on specific anticoagulants"
    ],
    emptyStomachDrink: "Green vegetable juice (spinach, cucumber, mint, lemon) in lukewarm water",
    bedtimeDrink: "Warm water with 1/2 tsp pure cow ghee",
    specialNote: "Vitamin K is fat-soluble. Always consume green vegetables with a drop of healthy fat/ghee."
  },
  {
    id: "vitamin_a_d",
    name: "Vitamin A & D / Multi-vitamin",
    category: "deficiency",
    badge: "Immunity & Vision",
    foodsToEat: [
      "Orange & yellow vegetables (carrots, sweet potato, pumpkin, ripe papaya)",
      "Direct morning sunlight (15-25 minutes between 7:30 AM - 9:00 AM)",
      "A2 cow ghee and whole grass-fed milk",
      "Egg yolks and moringa powder",
      "Fresh amla and guava for multi-vitamin synergy"
    ],
    foodsToAvoid: [
      "Zero-fat fad diets (prevents fat-soluble vitamin absorption)",
      "Smoking and prolonged indoor sedentary lifestyle without sunlight",
      "Excess synthetic supplements without physician guidance"
    ],
    emptyStomachDrink: "Fresh carrot-amla juice with 3 drops of olive oil / melted ghee",
    bedtimeDrink: "Warm A2 milk with saffron (kesar) and turmeric",
    specialNote: "Vitamin D is synthesized by sunshine on skin. Vitamin A requires healthy dietary lipids to absorb."
  },

  // 3. Metabolic & Systemic Conditions
  {
    id: "pcod",
    name: "PCOD / PCOS",
    category: "metabolic",
    badge: "Hormonal Balance",
    foodsToEat: [
      "Spearmint tea (lowers excess androgens) 1-2 cups daily",
      "Seed cycling: Flaxseed & pumpkin seeds (Day 1-14), Sesame & sunflower seeds (Day 15-28)",
      "Cinnamon infused water (improves insulin sensitivity)",
      "Low glycemic index millets (foxtail, barnyard, ragi)",
      "High fiber greens (methi, palak) and sprouts"
    ],
    foodsToAvoid: [
      "Refined white sugar, sweets, chocolates, and pastries",
      "Dairy milk (switch to homemade almond or seed milk if cystic acne persists)",
      "Fried street food, refined oils, and packaged maida items",
      "Skipping meals and erratic sleep timing"
    ],
    emptyStomachDrink: "Warm water boiled with 1/2 tsp Ceylon cinnamon and 1 tsp soaked fenugreek (methi) seeds",
    bedtimeDrink: "Warm spearmint tea",
    specialNote: "Prioritize 30-40 minutes of daily brisk walking and finish dinner before 8:00 PM."
  },
  {
    id: "insulin_resistance",
    name: "Insulin Resistance",
    category: "metabolic",
    badge: "Metabolic Health",
    foodsToEat: [
      "Fenugreek (methi) seeds soaked overnight",
      "Jamun seed powder, bitter gourd (karela) juice",
      "Whole millets, barley, oats, and cooked legumes",
      "Apple cider vinegar (1 tsp in 1 glass water before meals)",
      "Abundant leafy salads with olive oil and roasted seeds"
    ],
    foodsToAvoid: [
      "High fructose corn syrup, fruit juices, and sweetened sodas",
      "Refined carbohydrates (white bread, pasta, white rice overload)",
      "Frequent mindless snacking every 1-2 hours",
      "Late-night carb-heavy dinners"
    ],
    emptyStomachDrink: "Warm water with 1 tsp soaked methi seeds or diluted apple cider vinegar",
    bedtimeDrink: "Warm cinnamon-infused water",
    specialNote: "Take a 10-minute slow walk immediately after lunch and dinner to reduce post-meal glucose spikes."
  },
  {
    id: "hairfall",
    name: "Hair Fall / Alopecia",
    category: "metabolic",
    badge: "Hair & Scalp",
    foodsToEat: [
      "Fresh curry leaves (chew 5-6 fresh leaves empty stomach)",
      "Amla juice and soaked black raisins",
      "Walnuts, soaked almonds, and roasted pumpkin seeds (zinc & biotin)",
      "Moringa powder and sprouted pulses for keratin synthesis",
      "Adequate clean protein at every meal"
    ],
    foodsToAvoid: [
      "Excessively salty and sour junk foods",
      "Smoking and stress-induced crash fasting diets",
      "Very hot water hair washes and chemical hair treatments"
    ],
    emptyStomachDrink: "Warm water with 1 tbsp amla juice + 5 chewed fresh curry leaves",
    bedtimeDrink: "Warm milk with soaked crushed almonds",
    specialNote: "Ensure thyroid and ferritin (iron store) levels are checked alongside dietary correction."
  },
  {
    id: "melasma",
    name: "Melasma / Skin Pigmentation",
    category: "metabolic",
    badge: "Dermatological",
    foodsToEat: [
      "Antioxidant-rich foods: pomegranates, berries, tomatoes (cooked lycopene)",
      "Carrot and beetroot juice (beta-carotene for cellular radiance)",
      "Vitamin C rich amla, oranges, bell peppers",
      "Omega-3 fatty acids: walnuts, flaxseeds, chia seeds",
      "Hydration: Minimum 3 liters water daily"
    ],
    foodsToAvoid: [
      "Inflammatory deep fried fast foods and trans fats",
      "Excess table sugar which accelerates skin glycation",
      "Direct unshielded peak noon sun exposure (use sunscreen & umbrella)"
    ],
    emptyStomachDrink: "Warm water with lemon & 1 tsp chia seeds or fresh amla juice",
    bedtimeDrink: "Warm water with a pinch of pure saffron (kesar)",
    specialNote: "Melasma has deep hormonal connections. Balance gut health and liver detoxification."
  },
  {
    id: "weight_gain",
    name: "Healthy Weight Gain",
    category: "metabolic",
    badge: "Nutritive Caloric",
    foodsToEat: [
      "Banana date shake with soaked almonds and A2 cow milk",
      "Desi cow ghee (1-2 tsp over warm rice or dal)",
      "Soaked figs (anjeer), raisins, walnuts, and cashews",
      "Paneer, tofu, boiled whole eggs, and sattu halwa",
      "Sweet potatoes, boiled potatoes, and thick lentil soups"
    ],
    foodsToAvoid: [
      "Empty-calorie junk food (burgers, sugary sodas, oily chips) which causes visceral fat",
      "Drinking water right before meals (dampens appetite)",
      "Skipping meals or erratic eating windows"
    ],
    emptyStomachDrink: "Warm milk with 2 mashed bananas, 2 soaked figs, and 1 tsp organic honey",
    bedtimeDrink: "Warm full-cream milk with 2 crushed dates and a pinch of ashwagandha",
    specialNote: "Focus on calorie-dense, nutrient-rich whole foods combined with progressive strength exercises."
  },
  {
    id: "weight_loss",
    name: "Weight Loss / Fat Burn",
    category: "metabolic",
    badge: "Metabolism Reset",
    foodsToEat: [
      "Warm lemon water with pinch of cinnamon",
      "Ash gourd (white pumpkin) juice on empty stomach",
      "High fiber vegetables (cucumber, zucchini, spinach, cabbage)",
      "Moong dal chilla, vegetable oats, and boiled sprouts",
      "Green tea or herbal ginger tea between meals"
    ],
    foodsToAvoid: [
      "Deep fried foods, bakery items, and sweet desserts",
      "Refined white flour (maida), white bread, and refined oils",
      "Carbonated sweetened drinks and alcoholic beverages",
      "Eating dinner past 8:00 PM"
    ],
    emptyStomachDrink: "Warm water with 1/2 lemon juice + 1/4 tsp cinnamon powder",
    bedtimeDrink: "Warm water with 1/2 tsp triphala powder or chamomile tea",
    specialNote: "Maintain 14-hour intermittent overnight fasting window (e.g. 7:30 PM dinner to 9:30 AM breakfast)."
  },
  {
    id: "height_growth",
    name: "Height Growth (Pediatric / Adolescent)",
    category: "metabolic",
    badge: "Growth Acceleration",
    foodsToEat: [
      "Ragi malt (calcium powerhouse) cooked with cow milk",
      "Whole boiled eggs, paneer, and sprouted pulses (amino acids)",
      "Soaked almonds and walnuts (brain and bone development)",
      "Fresh seasonal fruits (banana, mango, guava) and green vegetables",
      "Adequate morning sunlight for natural Vitamin D"
    ],
    foodsToAvoid: [
      "Caffeinated energy drinks, colas, and packaged instant noodles",
      "Excessive salty chips and preservative-laden processed foods",
      "Late-night screen time that suppresses pituitary growth hormone (HGH)"
    ],
    emptyStomachDrink: "Warm ragi milk shake with soaked almonds and a hint of jaggery",
    bedtimeDrink: "Warm A2 cow milk with turmeric and a pinch of crushed nuts",
    specialNote: "Crucial: 9 hours of undisturbed sleep every night. Encourage daily outdoor hanging and stretching."
  },
  {
    id: "adenoids_tonsillitis",
    name: "Adenoids / Tonsillitis",
    category: "metabolic",
    badge: "ENT & Lymphatic",
    foodsToEat: [
      "Warm turmeric milk (golden milk) with black pepper",
      "Warm clear vegetable soups with ginger and garlic",
      "Lukewarm water throughout the day (strictly no refrigerated water)",
      "Tulsi and ginger infused herbal tea with organic honey",
      "Steamed apples and warm soft khichdi"
    ],
    foodsToAvoid: [
      "Ice creams, chilled fruit juices, and refrigerated water",
      "Sour fermented batters, excess tamarind, and sour curd",
      "Fried crispy snacks that scratch or irritate inflamed tonsils",
      "Cold aerated drinks and synthetic colored confectioneries"
    ],
    emptyStomachDrink: "Warm water with 1/2 tsp turmeric powder and 1 tsp pure honey",
    bedtimeDrink: "Warm golden milk (turmeric + pinch of black pepper) after warm salt water gargle",
    specialNote: "Perform warm saline gargles twice daily. Keep chest and throat protected from direct cold air conditioning."
  },
  {
    id: "allergies",
    name: "Allergies (Food & Environmental)",
    category: "metabolic",
    badge: "Immune Regulation",
    foodsToEat: [
      "Anti-inflammatory turmeric, ginger, and tulsi teas",
      "Quercetin rich foods: red onions (cooked), apples, green tea",
      "Fresh amla juice (natural antihistamine vitamin C)",
      "Steamed seasonal vegetables and light lentil broths",
      "Warm filtered water"
    ],
    foodsToAvoid: [
      "Known personal allergen triggers (peanuts, shellfish, dairy, gluten if sensitive)",
      "Aged cheeses, processed cured meats, and artificial food colorings",
      "Stale refrigerated leftovers that accumulate histamine",
      "Cold sodas and synthetic iced teas"
    ],
    emptyStomachDrink: "Warm water with 1 tsp amla juice and 4 crushed tulsi leaves",
    bedtimeDrink: "Warm ginger-licorice (mulethi) infusion",
    specialNote: "Keep a food symptom diary to pinpoint specific hypersensitivities."
  },
  {
    id: "bp",
    name: "Blood Pressure (Hypertension / BP)",
    category: "metabolic",
    badge: "Cardiovascular",
    foodsToEat: [
      "Potassium-rich foods: tender coconut water, bananas, spinach, sweet potatoes",
      "Fresh beetroot juice or boiled beetroot (natural nitric oxide for vasodilation)",
      "Raw garlic (1 crushed clove in warm water) or cooked garlic",
      "Flaxseeds and chia seeds for heart-healthy omega-3s",
      "Pomegranate and soaked walnuts"
    ],
    foodsToAvoid: [
      "Excess table salt, salted pickles, papad, and savory chutneys",
      "Packaged canned soups, instant noodles, and processed cheese",
      "Deep fried foods and hydrogenated vanaspati ghee",
      "Excess caffeine, smoking, and chronic unmanaged emotional stress"
    ],
    emptyStomachDrink: "Warm water with 1 crushed garlic clove and a squeeze of fresh lemon",
    bedtimeDrink: "Warm chamomile tea or plain lukewarm water",
    specialNote: "Practice 15 minutes of deep diaphragmatic breathing (Pranayama) every morning and evening."
  },
  {
    id: "sugar",
    name: "Sugar (Diabetes / High Glucose)",
    category: "metabolic",
    badge: "Glycemic Control",
    foodsToEat: [
      "Fenugreek (methi) water with chewed soaked seeds",
      "Jamun seed powder and bitter gourd (karela) juice",
      "Complex low-GI grains: barley, whole oats, foxtail millet, besan chilla",
      "High fiber vegetables: methi, spinach, bottle gourd, cucumber, beans",
      "Cinnamon powder sprinkled over oatmeal or in tea"
    ],
    foodsToAvoid: [
      "Refined white sugar, jaggery excess, honey excess, and sweets",
      "White bread, maida rotis, and polished white rice",
      "Sugary fruit juices, sodas, and energy drinks",
      "Deep fried oily snacks and high-glycemic tropical fruits in excess (watermelon, mangoes, cheeku)"
    ],
    emptyStomachDrink: "Warm water with 1 tsp soaked methi seeds (chew seeds thoroughly)",
    bedtimeDrink: "Warm water boiled with Ceylon cinnamon stick",
    specialNote: "Never skip meals. Test blood glucose periodically and engage in a 15-minute post-meal gentle stroll."
  }
];

export interface PatientMetrics {
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
}

export function calculateBMI(heightCm: number, weightKg: number): {
  bmi: number;
  category: "Underweight" | "Normal" | "Overweight" | "Obesity I" | "Obesity II" | "Severe Obesity";
  color: string;
  idealWeightRange: string;
} {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return {
      bmi: 0,
      category: "Normal",
      color: "#64748b",
      idealWeightRange: "50 - 65 kg"
    };
  }

  const heightM = heightCm / 100;
  const bmiVal = Number((weightKg / (heightM * heightM)).toFixed(1));

  const minIdeal = Number((18.5 * heightM * heightM).toFixed(1));
  const maxIdeal = Number((24.9 * heightM * heightM).toFixed(1));
  const idealWeightRange = `${minIdeal} - ${maxIdeal} kg`;

  if (bmiVal < 18.5) {
    return { bmi: bmiVal, category: "Underweight", color: "#3b82f6", idealWeightRange };
  } else if (bmiVal <= 24.9) {
    return { bmi: bmiVal, category: "Normal", color: "#10b981", idealWeightRange };
  } else if (bmiVal <= 29.9) {
    return { bmi: bmiVal, category: "Overweight", color: "#f59e0b", idealWeightRange };
  } else if (bmiVal <= 34.9) {
    return { bmi: bmiVal, category: "Obesity I", color: "#f97316", idealWeightRange };
  } else if (bmiVal <= 39.9) {
    return { bmi: bmiVal, category: "Obesity II", color: "#ef4444", idealWeightRange };
  } else {
    return { bmi: bmiVal, category: "Severe Obesity", color: "#b91c1c", idealWeightRange };
  }
}

export interface DayDietPlan {
  day: number;
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
}

export function generate30DayDietSchedule(
  selectedConditionIds: string[],
  age: number,
  bmiCategory: string
): DayDietPlan[] {
  const selected = DIET_CONDITIONS.filter((c) => selectedConditionIds.includes(c.id));
  const isDigestive = selected.some((c) => c.category === "digestive");
  const isSugarBp = selectedConditionIds.includes("sugar") || selectedConditionIds.includes("bp");
  const isWeightLoss = selectedConditionIds.includes("weight_loss");

  // Rotating varied menu pool based on clinical conditions
  const breakfastPool = [
    isDigestive
      ? "Steamed Ragi / Moong Dal Idli (2) + Strained Mint Chutney + 5 Soaked Almonds"
      : isSugarBp
      ? "Methi & Sprouted Moong Chilla (2) + Coriander Dip + 1 Walnut"
      : "Vegetable Oats Porridge with Cinnamon & Chia Seeds + 5 Soaked Almonds",
    "Sprouted Green Moong & Besan Chilla with Grated Lauki + Lukewarm Herbal Tea",
    isWeightLoss
      ? "Boiled Egg Whites (2) / Steamed Tofu Bowl + Sliced Cucumbers & Flaxseeds"
      : "Vegetable Daliya / Broken Wheat Upma with Green Beans & Carrots",
    "Steamed Oats & Vegetable Idlis (2-3) with Fresh Coconut-Coriander Chutney",
    "Warm Ragi Malt / Porridge (sugar-free) + Handful of Roasted Pumpkin Seeds",
    "Soft Poha with Steamed Peas, Turmeric, Lemon Juice + 4 Soaked Black Raisins",
    "Mixed Sprouts Chaat (Steamed) with Pomegranate Arils & Roasted Jeera Powder"
  ];

  const lunchPool = [
    isDigestive
      ? "Yellow Moong Dal Khichdi + Steamed Bottle Gourd (Lauki) + 1 Cup Thin Buttermilk"
      : isSugarBp
      ? "2 Jowar / Multigrain Rotis + Palak Dal + Sautéed Karela / Bhindi + Fresh Curd"
      : "1-2 Phulkas + Mixed Vegetable Curry + Yellow Tadka Moong Dal + Cucumber Salad",
    "1 Small Bowl Brown/White Rice + Drumstick Sambar + Steamed Ridge Gourd (Turai)",
    "2 Multigrain Rotis + Paneer/Tofu Bhurji (light oil) + Masoor Dal + Roasted Jeera Buttermilk",
    "1 Bowl Steamed Quinoa or Jasmine Rice + Palak Dal + Boiled Pumpkin Sabzi",
    "2 Jowar Rotis + Methi Sabzi + Yellow Toor Dal + Carrot-Cucumber Slices",
    "Moong Dal & Vegetable Stew + 1 Phulka or 1/2 Cup Rice + Churned Curd with Rock Salt",
    "2 Multigrain Phulkas + Lauki Chana Dal Curry + Fresh Coriander Curd"
  ];

  const snacksPool = [
    "Roasted Makhana (Foxnuts) with rock salt + 1 Cup Warm Fennel (Saunf) Tea",
    "Fresh Tender Coconut Water + Handful of Roasted Sunflower & Pumpkin Seeds",
    "1 Bowl Fresh Sweet Papaya Slices or Steamed Apple with Cinnamon",
    "Boiled Chickpeas (Sundal) / Roasted Chana + 1 Glass Spiced Buttermilk",
    "Chamomile / Tulsi Ginger Herbal Infusion + 2 Soaked Dried Figs (Anjeer)",
    "1 Bowl Pomegranate / Guava Slices + 5 Soaked Almonds & 1 Walnut",
    "Spiced Warm Vegetable Broth with Black Pepper & Coriander Leaves"
  ];

  const dinnerPool = [
    isDigestive
      ? "Light Vegetable Daliya Khichdi with 1/2 tsp A2 Ghee + Warm Bottle Gourd Soup"
      : "1 Jowar Roti + Steamed Bottle Gourd (Lauki) Curry + Clear Moong Dal Soup",
    "Warm Pumpkin & Carrot Pureed Soup + Grilled Paneer/Tofu Cubes (lightly spiced)",
    "Moong Dal Khichdi with Tender French Beans & Cumin Infusion",
    "1 Soft Phulka + Sautéed Zucchini & Bottle Gourd + Yellow Dal Soup",
    "Steamed Vegetable & Lentil Stew with a pinch of Hing and A2 Cow Ghee",
    "1 Multigrain Roti + Cooked Spinach & Sweet Corn Sabzi + Light Rasam Soup",
    "Light Oats Khichdi with Grated Bottle Gourd, Carrots & Roasted Cumin"
  ];

  const schedule: DayDietPlan[] = [];
  for (let day = 1; day <= 30; day++) {
    schedule.push({
      day,
      breakfast: breakfastPool[(day - 1) % breakfastPool.length],
      lunch: lunchPool[(day - 1) % lunchPool.length],
      snacks: snacksPool[(day - 1) % snacksPool.length],
      dinner: dinnerPool[(day - 1) % dinnerPool.length],
    });
  }

  return schedule;
}

export function generate30DayDietPlan(
  patient: {
    name?: string;
    age?: number;
    gender?: string;
    phone?: string;
    branch?: string;
    registrationId?: string;
  },
  metrics: PatientMetrics,
  selectedConditionIds: string[],
  dietFee: number
): string {
  const { bmi, category, idealWeightRange } = calculateBMI(metrics.heightCm, metrics.weightKg);
  const selected = DIET_CONDITIONS.filter((c) => selectedConditionIds.includes(c.id));

  // Collect foods to eat and avoid uniquely
  const allEat = Array.from(new Set(selected.flatMap((c) => c.foodsToEat)));
  const allAvoid = Array.from(new Set(selected.flatMap((c) => c.foodsToAvoid)));

  // If none selected, default clinical healthy nutrition
  if (allEat.length === 0) {
    allEat.push(
      "Fresh seasonal fruits (papaya, apples, pomegranate, guava)",
      "High fiber green vegetables (bottle gourd, spinach, zucchini)",
      "Whole grains (oats, ragi, foxtail millet, quinoa)",
      "Clean protein: sprouted moong, lentils, paneer, boiled eggs",
      "Soaked nuts: 5 almonds, 1 walnut, 1 tsp pumpkin seeds daily"
    );
  }
  if (allAvoid.length === 0) {
    allAvoid.push(
      "Deep fried foods, street chaat, and reused heated cooking oils",
      "Refined white sugar, pastries, sweets, and carbonated colas",
      "Excess red chillies, raw onions, and garlic before homeopathic remedies",
      "Late night heavy dinners past 8:30 PM",
      "Drinking chilled ice water during or immediately after meals"
    );
  }

  const emptyStomachItems = selected
    .map((c) => c.emptyStomachDrink)
    .filter(Boolean);
  const morningDrink = emptyStomachItems.length > 0
    ? emptyStomachItems[0]
    : "1 Glass lukewarm water with 1/2 tsp soaked chia or jeera seeds";

  const bedtimeItems = selected
    .map((c) => c.bedtimeDrink)
    .filter(Boolean);
  const nightDrink = bedtimeItems.length > 0
    ? bedtimeItems[0]
    : "1 Cup warm water with a pinch of roasted fennel powder or golden milk";

  const conditionNames = selected.map((c) => c.name).join(", ") || "General Wellness & Digestion Alignment";
  const daysTable = generate30DayDietSchedule(selectedConditionIds, metrics.age, category);

  const planText = `
================================================================================
           SPIRITUAL HOMEOPATHY CLINICS - PERSONALIZED 30-DAY DIET PLAN
================================================================================
PATIENT DETAILS:
• Patient Name: ${patient.name || "Patient"}
• Reg ID: ${patient.registrationId || "N/A"} | Branch: ${patient.branch || "Clinic"}
• Age: ${metrics.age || patient.age || "N/A"} yrs | Gender: ${metrics.gender || patient.gender || "N/A"}
• Height: ${metrics.heightCm ? `${metrics.heightCm} cm` : "N/A"} | Weight: ${metrics.weightKg ? `${metrics.weightKg} kg` : "N/A"}
• Calculated BMI: ${bmi > 0 ? `${bmi} kg/m² (${category})` : "N/A"}
• Healthy Ideal Weight Target: ${idealWeightRange}
• Clinical Focus & Deficiencies: ${conditionNames}
• Prescribed Diet Plan Fee: ₹${dietFee}
--------------------------------------------------------------------------------

⭐ CRITICAL 30-MINUTE DIGESTION RULE (MANDATORY HOMEOPATHIC PROTOCOL):
"DO NOT drink water 30 minutes before your meal and DO NOT drink water until 30 minutes
AFTER your meal. Drinking water during meals dilutes gastric enzymes and suppresses
metabolic digestion. Sip lukewarm water throughout the remainder of the day (Total: 2.5 - 3.5 Liters)."

--------------------------------------------------------------------------------
1. FOODS TO CONSUME (WHAT TO EAT):
--------------------------------------------------------------------------------
${allEat.map((f, i) => `${i + 1}. ${f}`).join("\n")}

--------------------------------------------------------------------------------
2. FOODS TO STRICTLY AVOID (WHAT NOT TO EAT):
--------------------------------------------------------------------------------
${allAvoid.map((f, i) => `✖ ${f}`).join("\n")}

--------------------------------------------------------------------------------
3. MORNING & BEDTIME CLINICAL ROUTINE:
--------------------------------------------------------------------------------
• [06:30 AM EMPTY STOMACH]: ${morningDrink}
• [09:30 PM BEDTIME DRINK]: ${nightDrink}

--------------------------------------------------------------------------------
4. PERSONALIZED 30-DAY DAILY MEAL TABLE (DAY 1 TO DAY 30):
--------------------------------------------------------------------------------
${daysTable.map((d) => `[DAY ${d.day.toString().padStart(2, "0")}]
  • Breakfast: ${d.breakfast}
  • Lunch:     ${d.lunch}
  • Snacks:    ${d.snacks}
  • Dinner:    ${d.dinner}`).join("\n\n")}

--------------------------------------------------------------------------------
5. PROGRESSIVE 30-DAY ROADMAP:
--------------------------------------------------------------------------------
• WEEK 1 (Days 1 - 7): GUT DETOXIFICATION & INFLAMMATION RESET
  Focus: Flush toxins, reduce bloating, settle gastric acidity, strictly adhere to the 30-minute water rule.
• WEEK 2 (Days 8 - 14): MICRONUTRIENT REPLETION & METABOLIC ALIGNMENT
  Focus: Deepen vitamin & mineral replenishment (iron, zinc, magnesium), stabilize blood glucose levels.
• WEEK 3 (Days 15 - 21): CELLULAR REPAIR & HORMONAL HARMONY
  Focus: Noticeable boost in physical energy, skin clearance, reduced hair shedding, regulated bowel movements.
• WEEK 4 (Days 22 - 30): METABOLIC STABILIZATION & HABIT FORMATION
  Focus: Solidify metabolic rhythm, sustained healthy weight milestone, review with doctor at follow-up visit.

--------------------------------------------------------------------------------
SPECIAL HOMEOPATHIC REMEDY COMPLIANCE:
• Keep a minimum 20-30 minute gap between homeopathic medication and food/drinks.
• Avoid raw pungent garlic, raw red onions, and strong menthol chewing gums near remedy doses.
================================================================================
`.trim();

  return planText;
}

