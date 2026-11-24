/** Campaign desks store just the player's settings. Rendered diagrams and solutions
 * are derived from the published board, so snapshots also work in the offline build. */
export interface BoardFamily {
  name: string;
  title(index: number): string;
  initial(index: number): number[];
  valid(index: number, values: unknown): values is number[];
  solved(index: number, values: number[]): boolean;
  /** Local verbs from buttons or the keyboard. Return the new settings without mutating values. */
  apply(index: number, values: number[], verb: string): number[];
  hint(index: number, values: number[]): string;
  /** HTML for the diagram, instructions and controls, with data-action="board-VERB".
   * frame is an inspection cursor, controlled by the common time-step buttons if frames > 0. */
  render(index: number, values: number[], frame: number): string;
  frames?(index: number, values: number[]): number;
}
