import { createCn } from "cn/config";

/**
 * Class merging aware of the Projects (Desk) type scale, so e.g.
 * `text-table-header` (a size) isn't dropped when followed by `text-ink` (a colour).
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "2xs",
            "display",
            "h1",
            "h2",
            "label",
            "body",
            "caption",
            "nav-item",
            "nav-group-label",
            "table-header",
            "table-cell",
            "table-cell-secondary",
            "field-label",
            "button",
            "button-sm",
            "card-title",
            "badge",
          ],
        },
      ],
    },
  },
});
