/** @jsx jsx */
/* @jsxFrag React.Fragment */

import { jsx, css } from "@emotion/react";
import { useAutomergeDoc } from "./hooks";
import { MarkdownDoc, RichTextDoc } from "./slate-automerge";
import Automerge from "automerge";
import ReactJson from "react-json-view";
import PotluckEditor from "./PotluckEditor";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

// const DEFAULT_TEXT = `
// # Thai Peanut Noodle Bowls with Spicy Lime Tofu

// "The tart and spicy tofu cubes are great not just in this recipe but also in salads and on rice; however, you can substitute store-bought baked tofu (preferably an Asian-inspired flavor) if you're short on time."

// *Makes 4 bowls*

// *FOR THE SPICY LIME TOFU:*
// 1 (15 oz, or 425 g) block extra-firm tofu, preferably pressed, cut into 1-inch (2.5-cm) cubes*
// 3 tablespoons tamari
// 1 tablespoon neutral vegetable oil
// Finely grated zest of lime
// 3 tablespoons freshly squeezed lime juice
// 3 cloves garlic, minced
// 1/2 teaspoon red pepper flakes, plus more if desired

// *FOR THE SAUCE:*
// 5 tablespoons (80 g) smooth peanut butter
// 1/3 cup (80 ml) hot water
// 2 tablespoons red curry paste, plus more if desired
// 1 tablespoon tamari
// 1 clove garlic, minced
// 2 teaspoons maple syrup or agave nectar
// 3 tablespoons freshly squeezed lime juice

// *FOR THE BOWLS:*
// 2 cups (180 g) bite-size broccoli florets
// 2 cups {200 gl snow peas or sugar snap peas
// 7 ounces (200 gl asparagus, trimmed and cut into 1-inch (2.5-cml pieces
// 8 ounces (225 g) saba noodles

// *OPTIONAL TOPPINGS:*
// Chopped roasted peanuts or cashews, sriracha sauce, chopped scallions, chopped fresh basiL cilantro, or mint leaves

// TO PREPARE THE SPICY LIME TOFU:
// Put the tofu cubes in a shallow glass bowl or container, preferably one large enough to fit all of the tofu in a single layer.

// In a small bowl whisk together the tamari, oil lime zest and juice, garlic, and red pepper flakes. Pour the mixture over the tofu and stir gently to evenly coat the tofu. Let sit for at least 20 minutes, or cover and refrigerate for up to 12 hours.

// Preheat the oven to 400 degrees F (200C) and line a rimmed baking sheet with parchment paper.

// Remove the tofu from the marinade and spread it in a single layer on the lined baking sheet (discard any remaining marinade).

// Bake for 25 to 30 minutes, until crispy, flipping the tofu once halfway through the baking time.

// MEANWHILE, TO MAKE THE SAUCE:
// Combine all the ingredients in a small bowl and whisk until evenly blended.

// TO PREPARE THE REMAINING INGREDIENTS:
// Bring a large pot of water to a boil over high heat. Add the broccoli and blanch for 1 minute. Add the snow peas and asparagus and blanch for 1 to 2 minutes, until all of the vegetables are crisp-tender. Use a slotted spoon to transfer the vegetables to a colander to drain completely. Add the soba noodles to the same boiling water, then adjust the heat to maintain a low boil. Cook, stirring occasionally, until the noodles are tender but still firm, then drain the saba well and transfer to a large bowl. Add about three-quarters of the sauce and stir gently to combine.

// TO SERVE:
// Divide the noodles among four bowls and top each with one-quarter of the vegetables and tofu. then drizzle with the remaining sauce. Serve right away, with any other desired toppings.

// *HOW TO PRESS TOFU:
// You don't have to press tofu before cooking it, but it gives the tofu a firmer, denser texture. It also removes excess water, allowing the pressed tofu to crisp and brown more easily when cooked. Once pressed, tofu will soak up of any marinade you use, creating a more flavorful final product. Even as little as 20 minutes of pressing is usually worthwhile. To press tofu, simply put a block of tofu on a large rimmed plate. Set another plate on top of the tofu and weight it with a couple of heavy books or large cans of tomatoes. Let sit for at least 20 minutes, or press it for up to 8 hours at room temperature. Drain away the excess water and store the tofu in an airtight container in the fridge until you're ready to use it. It will keep for 3 days. `;

const DEFAULT_TEXT = `# Chili

Bring 2 pounds low fat (~90/10) ground chuck beef to room temperature, and season with 1 Tbsp onion powder, 2 tsp salt, and 3/8 tsp garlic powder.

Warm bacon fat or cooking oil in large pot over high heat, and add seasoned meat. Break meat into small pieces, and stir until meat is browned and liquid becomes gravy-like.

Add 12oz ipa beer or hop water, 8oz can tomato sauce/puree, 3 Tbl ground ancho chili powder, 1 tsp ground cumin, 1 tsp paprika, 1 tsp unsweetened cocoa powder, 1/4 tsp dried oregano, 1/4 tsp ground cayenne pepper, and 1/8 tsp ground cinnamon to meat mixture, and simmer over low heat for 2-3 hours, stirring regularly.

Add 1/8 Cup diced poblano peppers to mixture, and continue to simmer for 2 hours, stirring regularly.

Optionally rinse 1 can red kidney beans and 1 can black beans with water and drain. Gently stir beans into mixture, keeping the beans intact.

Simmer on low until liquid as evaporated. Chili is ready once flavors are blended and texture is to your liking.

Serve in bowl and garnish to taste with grated cheddar, avocado, sour cream, jalapeño, salsa, tortilla chips, Fritos, or corn bread.`;

export default function PotluckDemo() {
  const [doc, changeDoc] = useAutomergeDoc<MarkdownDoc>({
    content: new Automerge.Text(DEFAULT_TEXT),
    annotations: [],
  });

  return (
    <div className="max-w-6xl p-4">
      <PotluckEditor doc={doc} changeDoc={changeDoc} />
    </div>
  );
}
