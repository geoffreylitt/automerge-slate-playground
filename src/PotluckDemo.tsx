/** @jsx jsx */
/* @jsxFrag React.Fragment */

import {jsx, css} from "@emotion/react";
import {useAutomergeDoc} from "./hooks";
import {MarkdownDoc} from "./slate-automerge";
import Automerge from "automerge";
import PotluckEditor from "./PotluckEditor";
import {DURATION_TYPE, INGREDIENT_TYPE, SCALE_FACTOR_TYPE} from "./annotations";
import ingredientsPlugin from "./plugins/ingredients";
import scalerPlugin from "./plugins/scaler";
import timerPlugin from "./plugins/timer";
import {useState} from "react"
import {getMergedExtensions} from "./plugins";

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

Serve in bowl and garnish to taste with grated cheddar, avocado, sour cream, jalapeño, salsa, tortilla chips, Fritos, or corn bread.

**Scale factor**: 3x.`;

export type DefaultAnnotationSpec = {
  start: number;
  end: number;
  type: string;
};

const DEFAULT_ANNOTATIONS: DefaultAnnotationSpec[] = [
  { start: 15, end: 58, type: INGREDIENT_TYPE },
  { start: 96, end: 115, type: INGREDIENT_TYPE },
  { start: 117, end: 127, type: INGREDIENT_TYPE },
  { start: 133, end: 154, type: INGREDIENT_TYPE },
  { start: 336, end: 362, type: INGREDIENT_TYPE },
  { start: 364, end: 390, type: INGREDIENT_TYPE },
  { start: 392, end: 423, type: INGREDIENT_TYPE },
  { start: 425, end: 443, type: INGREDIENT_TYPE },
  { start: 445, end: 458, type: INGREDIENT_TYPE },
  { start: 460, end: 490, type: INGREDIENT_TYPE },
  { start: 492, end: 513, type: INGREDIENT_TYPE },
  { start: 515, end: 544, type: INGREDIENT_TYPE },
  { start: 550, end: 573, type: INGREDIENT_TYPE },
  { start: 1164, end: 1166, type: SCALE_FACTOR_TYPE },
  { start: 725, end: 732, type: DURATION_TYPE }
];

const SHOW_DATA_DUMP = false;

export default function PotluckDemo() {
  // can't use automerge currently because plugins contain fuction values
  const [plugins, setPlugins] = useState([ingredientsPlugin, scalerPlugin, timerPlugin]);
  const extensionsByType = getMergedExtensions(plugins)

  const [doc, changeDoc] = useAutomergeDoc<MarkdownDoc>({
    content: new Automerge.Text(DEFAULT_TEXT),
    annotations: [],
  }, (diff) => {
    if (diff.objectId !== '_root') {
      return
    }

    const annotations: any = Object.values(diff.props.annotations)[0]

    const changedIndex: { [index: string]: boolean } = {}
    const insertedIndex: { [index: string]: boolean } = {}
    const deletedIndex: { [index: string]: boolean } = {}

    const edits = annotations.edits;

    if (edits) {
      for (const edit of edits) {
        switch (edit.action) {
          case 'insert':
            insertedIndex[edit.index] = true
            break;
          case 'remove':
            deletedIndex[edit.index] = true
            break;
        }
      }
    }

    for (const prop of Object.keys(annotations.props)) {
      if (!insertedIndex[prop]) {
        changedIndex[prop] = true
      }
    }

    const changes = Object.entries(changedIndex)
      .map(([index]) => ({ type: 'change', index }))
      .concat(
        Object.entries(insertedIndex)
          .map(([index]) => ({ type: 'insert', index }))
      )
      .concat(
        Object.entries(deletedIndex)
          .map(([index]) => ({ type: 'remove', index }))
      )

    console.log('changes', changes)
  });

  return (
    <div className="max-w-6xl p-4">
      <PotluckEditor
        doc={doc}
        changeDoc={changeDoc}
        plugins={plugins}
        changePlugins={setPlugins}
        extensionsByType={extensionsByType}
        defaultAnnotations={DEFAULT_ANNOTATIONS}
      />

      {SHOW_DATA_DUMP && <pre>
        {JSON.stringify(
          doc.annotations.filter(({_type}) => _type === SCALE_FACTOR_TYPE),
          null,
          2
        )}
      </pre>}
    </div>
  );
}
