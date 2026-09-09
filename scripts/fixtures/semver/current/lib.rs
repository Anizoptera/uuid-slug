pub struct Options {
    pub existing: bool,
    pub required: bool,
}

pub trait Service {
    fn existing(&self);
    fn required(&self);
}

pub enum Outcome {
    Existing,
    Added,
}
