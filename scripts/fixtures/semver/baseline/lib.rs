pub struct Options {
    pub existing: bool,
}

pub trait Service {
    fn existing(&self);
}

pub enum Outcome {
    Existing,
}
